"""Semantic search: incremental indexing, hybrid ranking, graceful fallback."""

from __future__ import annotations

import os

import pytest

from app.core.config import get_settings
from app.infrastructure.llm.embeddings import EmbeddingProvider

# Deterministic "embeddings": each text maps onto topic-bucket axes, so
# related wording ("sign-in", "login") lands on the same axis with no
# keyword overlap required.
_BUCKETS: list[tuple[str, ...]] = [
    ("login", "auth", "sign-in", "signin", "oauth", "credential"),
    ("pasta", "cooking", "recipe", "kitchen"),
    ("chart", "graph", "visualization", "plot"),
]


class FakeEmbeddings(EmbeddingProvider):
    name = "fake"
    model = "fake-buckets"

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    def embed(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(list(texts))
        vectors = []
        for text in texts:
            lowered = text.lower()
            vector = [
                float(sum(lowered.count(word) for word in bucket)) for bucket in _BUCKETS
            ]
            # Ensure a non-zero vector so cosine stays defined.
            vectors.append(vector if any(vector) else [0.0] * (len(_BUCKETS) - 1) + [0.001])
        return vectors

    def is_available(self) -> bool:
        return True


def _make_index(session, embedder=None):
    from app.application.services.semantic_index import SemanticIndexService
    from app.infrastructure.repositories import (
        EmbeddingRepository,
        NoteRepository,
        ProjectRepository,
        ReadingRepository,
        TaskRepository,
    )

    return SemanticIndexService(
        embedder=embedder,
        embeddings=EmbeddingRepository(session),
        tasks=TaskRepository(session),
        projects=ProjectRepository(session),
        notes=NoteRepository(session),
        reading=ReadingRepository(session),
    )


def _make_search(session, semantic=None):
    from app.application.services.search_service import SearchService
    from app.infrastructure.repositories import (
        NoteRepository,
        ProjectRepository,
        ReadingRepository,
        TaskRepository,
    )

    return SearchService(
        tasks=TaskRepository(session),
        projects=ProjectRepository(session),
        notes=NoteRepository(session),
        reading=ReadingRepository(session),
        semantic=semantic,
    )


def test_semantic_search_finds_related_wording(client, session) -> None:
    """'sign-in' must surface the OAuth login task despite zero keyword overlap."""
    task = client.post(
        "/api/tasks", json={"title": "Fix OAuth login redirect", "description": "auth flow bug"}
    ).json()
    client.post("/api/tasks", json={"title": "Cook pasta dinner", "description": "kitchen"})

    embedder = FakeEmbeddings()
    index = _make_index(session, embedder)
    result = index.reindex()
    assert result["indexed"] >= 2

    hits = _make_search(session, index).search("sign-in")
    assert hits, "semantic hit expected"
    assert hits[0].id == task["id"]
    assert hits[0].match == "semantic"
    assert all(h.title != "Cook pasta dinner" for h in hits)


def test_hybrid_match_outranks_pure_keyword(client, session) -> None:
    """A hit matching both keyword and semantics is labeled hybrid and gains score."""
    client.post("/api/tasks", json={"title": "Login page polish", "description": "auth"})
    embedder = FakeEmbeddings()
    index = _make_index(session, embedder)
    index.reindex()

    baseline = _make_search(session, semantic=None).search("login")
    hybrid = _make_search(session, index).search("login")
    assert baseline[0].match == "keyword"
    assert hybrid[0].match == "hybrid"
    assert hybrid[0].score > baseline[0].score


def test_reindex_is_incremental_and_cleans_orphans(client, session) -> None:
    """Unchanged content is skipped (hash) and deleted entities lose vectors."""
    task = client.post("/api/tasks", json={"title": "Auth token refresh"}).json()
    embedder = FakeEmbeddings()
    index = _make_index(session, embedder)

    first = index.reindex()
    second = index.reindex()
    assert first["indexed"] >= 1
    assert second["indexed"] == 0
    assert second["skipped"] == first["indexed"]
    assert len(embedder.calls) == 1  # no re-embedding on the unchanged pass

    client.delete(f"/api/tasks/{task['id']}")
    session.expire_all()
    third = index.reindex()
    assert third["deleted"] == 1


def test_search_works_without_embedder(client) -> None:
    """No provider: keyword-only results, and the endpoints stay honest."""
    client.post("/api/tasks", json={"title": "Fix OAuth login redirect"})
    hits = client.get("/api/search?q=login").json()
    assert hits and hits[0]["match"] == "keyword"
    # Semantically-related-only wording finds nothing without an embedder.
    assert client.get("/api/search?q=sign-in").json() == []

    status = client.get("/api/search/semantic/status").json()
    assert status["available"] is False
    assert "keyword" in status["detail"]


@pytest.fixture()
def no_embeddings():
    os.environ["FOUNDEROS_EMBEDDING_PROVIDER"] = "none"
    get_settings.cache_clear()
    yield
    os.environ.pop("FOUNDEROS_EMBEDDING_PROVIDER", None)
    get_settings.cache_clear()


def test_reindex_endpoint_503_when_disabled(no_embeddings, client) -> None:
    response = client.post("/api/search/reindex")
    assert response.status_code == 503
    assert "Semantic reindex unavailable" in response.json()["detail"]
