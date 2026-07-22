"""Semantic search index: embeds tasks/projects/notes/reading into vectors.

Reindexing is incremental (content-hash skip) and runs on a background
interval plus on demand. Query-time similarity is plain in-process cosine —
at single-user scale (thousands of entities) that's a few milliseconds and
needs no vector-database dependency.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from typing import Any

from app.application.interfaces import (
    NoteRepositoryProtocol,
    ProjectRepositoryProtocol,
    ReadingRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.core.logging import get_logger
from app.domain.entities import Embedding, utcnow
from app.infrastructure.llm.base import LLMError
from app.infrastructure.llm.embeddings import EmbeddingProvider
from app.infrastructure.repositories.misc import EmbeddingRepository

logger = get_logger("semantic")

_BATCH_SIZE = 32
_MAX_DOC_CHARS = 2000  # embedding models truncate anyway; keep requests light


@dataclass(frozen=True)
class SemanticHit:
    kind: str
    entity_id: str
    similarity: float  # cosine, 0..1 for normalized-ish embeddings


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


class SemanticIndexService:
    def __init__(
        self,
        embedder: EmbeddingProvider | None,
        embeddings: EmbeddingRepository,
        tasks: TaskRepositoryProtocol,
        projects: ProjectRepositoryProtocol,
        notes: NoteRepositoryProtocol,
        reading: ReadingRepositoryProtocol,
    ) -> None:
        self._embedder = embedder
        self._repo = embeddings
        self._tasks = tasks
        self._projects = projects
        self._notes = notes
        self._reading = reading

    # Status ---------------------------------------------------------------

    def status(self) -> dict[str, Any]:
        available = self._embedder is not None and self._embedder.is_available()
        return {
            "available": available,
            "provider": self._embedder.name if self._embedder else None,
            "model": self._embedder.model if self._embedder else None,
            "indexed": self._repo.count(),
            "detail": (
                "ready"
                if available
                else (
                    "embedding model unreachable — keyword search active"
                    if self._embedder
                    else "no embedding provider configured — keyword search active"
                )
            ),
        }

    # Indexing -------------------------------------------------------------

    def reindex(self) -> dict[str, int]:
        """Embed new/changed entities, drop orphans. Raises LLMError only if
        the provider fails mid-batch; callers treat that as 'try later'."""
        if self._embedder is None or not self._embedder.is_available():
            raise LLMError("No embedding provider available")
        model = self._embedder.model
        documents = self._documents()
        live_ids = {doc_id for doc_id, _ in documents}

        pending: list[tuple[str, str, str]] = []  # (id, hash, text)
        skipped = 0
        for doc_id, text in documents:
            content_hash = hashlib.sha256(f"{model}\n{text}".encode()).hexdigest()
            existing = self._repo.get(doc_id)
            if existing is not None and existing.content_hash == content_hash:
                skipped += 1
                continue
            pending.append((doc_id, content_hash, text))

        indexed = 0
        for start in range(0, len(pending), _BATCH_SIZE):
            batch = pending[start : start + _BATCH_SIZE]
            vectors = self._embedder.embed([text for _, _, text in batch])
            for (doc_id, content_hash, _), vector in zip(batch, vectors):
                kind, _, entity_id = doc_id.partition(":")
                row = self._repo.get(doc_id) or Embedding(
                    id=doc_id, kind=kind, entity_id=entity_id, model=model, content_hash=""
                )
                row.model = model
                row.content_hash = content_hash
                row.vector = list(vector)  # fresh list so JSON column change tracks
                row.updated_at = utcnow()
                self._repo.save(row)
                indexed += 1

        deleted = self._repo.delete_orphans(live_ids)
        if indexed or deleted:
            logger.info(
                "Semantic reindex: %d embedded, %d unchanged, %d removed", indexed, skipped, deleted
            )
        return {"indexed": indexed, "skipped": skipped, "deleted": deleted, "total": len(live_ids)}

    # Query ----------------------------------------------------------------

    def semantic_hits(self, query: str, limit: int = 30, min_similarity: float = 0.3) -> list[SemanticHit]:
        """Rank indexed entities by cosine similarity to the query. Returns []
        (never raises) when the provider is missing or unreachable."""
        if self._embedder is None or not self._embedder.is_available():
            return []
        try:
            query_vector = self._embedder.embed([query[:_MAX_DOC_CHARS]])[0]
        except LLMError:
            return []
        hits = [
            SemanticHit(kind=row.kind, entity_id=row.entity_id, similarity=similarity)
            for row in self._repo.list_all()
            if (similarity := cosine_similarity(query_vector, row.vector)) >= min_similarity
        ]
        hits.sort(key=lambda h: -h.similarity)
        return hits[:limit]

    # Internals ------------------------------------------------------------

    def _documents(self) -> list[tuple[str, str]]:
        docs: list[tuple[str, str]] = []
        for task in self._tasks.list(include_archived=True):
            docs.append((f"task:{task.id}", self._text(task.title, task.description, task.tags + task.labels)))
        for project in self._projects.list(include_archived=True):
            docs.append((f"project:{project.id}", self._text(project.name, project.description, project.goals)))
        for note in self._notes.list():
            docs.append((f"note:{note.id}", self._text(note.title, note.content_md, note.tags)))
        for item in self._reading.list():
            docs.append((f"reading:{item.id}", self._text(item.title, f"{item.author} {item.url}", [])))
        return docs

    @staticmethod
    def _text(title: str, body: str, tags: list[str]) -> str:
        combined = f"{title}\n{body or ''}\n{' '.join(tags)}".strip()
        return combined[:_MAX_DOC_CHARS]
