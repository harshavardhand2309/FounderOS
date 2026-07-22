"""Global search across tasks, projects, notes and reading items.

Hybrid ranking: instant keyword scoring (title prefix > title match > body
match) always works offline; when an embedding provider is configured (see
``SemanticIndexService``), cosine-similar entities blend into the same result
list — so "sign-in flow" finds the "OAuth login" task. Each hit is labeled
``keyword`` | ``semantic`` | ``hybrid`` so the UI can show provenance.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

from app.application.interfaces import (
    NoteRepositoryProtocol,
    ProjectRepositoryProtocol,
    ReadingRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.application.services.semantic_index import SemanticIndexService

_SNIPPET_RADIUS = 60
_SCORE_TITLE_PREFIX = 3.0
_SCORE_TITLE_MATCH = 2.0
_SCORE_BODY_MATCH = 1.0
_SCORE_TAG_MATCH = 1.5
# Cosine similarity (0..1) scaled onto the keyword-score range so a strong
# semantic match (~0.7+) competes with a title match.
_SEMANTIC_WEIGHT = 4.0
_SEMANTIC_MIN_SIMILARITY = 0.3


@dataclass(frozen=True)
class SearchHit:
    kind: str  # "task" | "project" | "note" | "reading"
    id: str
    title: str
    snippet: str
    score: float
    project_id: str | None = None
    status: str | None = None
    match: str = "keyword"  # "keyword" | "semantic" | "hybrid"


class SearchService:
    def __init__(
        self,
        tasks: TaskRepositoryProtocol,
        projects: ProjectRepositoryProtocol,
        notes: NoteRepositoryProtocol,
        reading: ReadingRepositoryProtocol,
        semantic: SemanticIndexService | None = None,
    ) -> None:
        self._tasks = tasks
        self._projects = projects
        self._notes = notes
        self._reading = reading
        self._semantic = semantic

    def search(self, query: str, limit: int = 30) -> list[SearchHit]:
        q = query.strip().lower()
        if not q:
            return []
        keyword_hits: dict[tuple[str, str], SearchHit] = {}
        # Every candidate hit (scored 0) indexed by (kind, id), so semantic
        # matches can be materialized without a second repository pass.
        candidates: dict[tuple[str, str], SearchHit] = {}

        for task in self._tasks.list(include_archived=True):
            hit = SearchHit(
                kind="task",
                id=task.id,
                title=task.title,
                snippet=self._snippet(q, task.description),
                score=self._score(q, task.title, task.description, task.tags + task.labels),
                project_id=task.project_id,
                status=task.status.value,
            )
            candidates[("task", task.id)] = hit
            if hit.score > 0:
                keyword_hits[("task", task.id)] = hit

        for project in self._projects.list(include_archived=True):
            hit = SearchHit(
                kind="project",
                id=project.id,
                title=project.name,
                snippet=self._snippet(q, project.description),
                score=self._score(q, project.name, project.description, project.goals),
                status=project.status.value,
            )
            candidates[("project", project.id)] = hit
            if hit.score > 0:
                keyword_hits[("project", project.id)] = hit

        for note in self._notes.list():
            hit = SearchHit(
                kind="note",
                id=note.id,
                title=note.title,
                snippet=self._snippet(q, note.content_md),
                score=self._score(q, note.title, note.content_md, note.tags),
                project_id=note.project_id,
                status=note.kind.value,
            )
            candidates[("note", note.id)] = hit
            if hit.score > 0:
                keyword_hits[("note", note.id)] = hit

        for item in self._reading.list():
            hit = SearchHit(
                kind="reading",
                id=item.id,
                title=item.title,
                snippet=item.author or item.url,
                score=self._score(q, item.title, item.author + " " + item.url, []),
                project_id=item.project_id,
                status=item.status.value,
            )
            candidates[("reading", item.id)] = hit
            if hit.score > 0:
                keyword_hits[("reading", item.id)] = hit

        merged = self._blend_semantic(query, keyword_hits, candidates)
        merged.sort(key=lambda h: (-h.score, h.title.lower()))
        return merged[:limit]

    def _blend_semantic(
        self,
        query: str,
        keyword_hits: dict[tuple[str, str], SearchHit],
        candidates: dict[tuple[str, str], SearchHit],
    ) -> list[SearchHit]:
        results = dict(keyword_hits)
        if self._semantic is not None:
            for sem in self._semantic.semantic_hits(
                query, limit=len(candidates) or 1, min_similarity=_SEMANTIC_MIN_SIMILARITY
            ):
                key = (sem.kind, sem.entity_id)
                base = candidates.get(key)
                if base is None:  # stale vector for a deleted entity
                    continue
                bonus = sem.similarity * _SEMANTIC_WEIGHT
                if key in results:
                    hit = results[key]
                    results[key] = replace(hit, score=hit.score + bonus, match="hybrid")
                else:
                    results[key] = replace(base, score=bonus, match="semantic")
        return list(results.values())

    @staticmethod
    def _score(q: str, title: str, body: str, tags: list[str]) -> float:
        title_l = (title or "").lower()
        body_l = (body or "").lower()
        score = 0.0
        if title_l.startswith(q):
            score += _SCORE_TITLE_PREFIX
        elif q in title_l:
            score += _SCORE_TITLE_MATCH
        if q in body_l:
            score += _SCORE_BODY_MATCH
        if any(q in (tag or "").lower() for tag in tags):
            score += _SCORE_TAG_MATCH
        return score

    @staticmethod
    def _snippet(q: str, body: str) -> str:
        if not body:
            return ""
        body_l = body.lower()
        idx = body_l.find(q)
        if idx < 0:
            return body[: _SNIPPET_RADIUS * 2].strip()
        start = max(0, idx - _SNIPPET_RADIUS)
        end = min(len(body), idx + len(q) + _SNIPPET_RADIUS)
        prefix = "…" if start > 0 else ""
        suffix = "…" if end < len(body) else ""
        return f"{prefix}{body[start:end].strip()}{suffix}"
