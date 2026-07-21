"""Global search across tasks, projects, notes and reading items.

Instant keyword search with simple relevance ranking (title prefix > title
match > body match). Semantic search plugs in via the AI layer when an
embedding-capable provider is configured; this keyword path always works
offline.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.application.interfaces import (
    NoteRepositoryProtocol,
    ProjectRepositoryProtocol,
    ReadingRepositoryProtocol,
    TaskRepositoryProtocol,
)

_SNIPPET_RADIUS = 60
_SCORE_TITLE_PREFIX = 3.0
_SCORE_TITLE_MATCH = 2.0
_SCORE_BODY_MATCH = 1.0
_SCORE_TAG_MATCH = 1.5


@dataclass(frozen=True)
class SearchHit:
    kind: str  # "task" | "project" | "note" | "reading"
    id: str
    title: str
    snippet: str
    score: float
    project_id: str | None = None
    status: str | None = None


class SearchService:
    def __init__(
        self,
        tasks: TaskRepositoryProtocol,
        projects: ProjectRepositoryProtocol,
        notes: NoteRepositoryProtocol,
        reading: ReadingRepositoryProtocol,
    ) -> None:
        self._tasks = tasks
        self._projects = projects
        self._notes = notes
        self._reading = reading

    def search(self, query: str, limit: int = 30) -> list[SearchHit]:
        q = query.strip().lower()
        if not q:
            return []
        hits: list[SearchHit] = []

        for task in self._tasks.list(include_archived=True):
            score = self._score(q, task.title, task.description, task.tags + task.labels)
            if score > 0:
                hits.append(
                    SearchHit(
                        kind="task",
                        id=task.id,
                        title=task.title,
                        snippet=self._snippet(q, task.description),
                        score=score,
                        project_id=task.project_id,
                        status=task.status.value,
                    )
                )

        for project in self._projects.list(include_archived=True):
            score = self._score(q, project.name, project.description, project.goals)
            if score > 0:
                hits.append(
                    SearchHit(
                        kind="project",
                        id=project.id,
                        title=project.name,
                        snippet=self._snippet(q, project.description),
                        score=score,
                        status=project.status.value,
                    )
                )

        for note in self._notes.list():
            score = self._score(q, note.title, note.content_md, note.tags)
            if score > 0:
                hits.append(
                    SearchHit(
                        kind="note",
                        id=note.id,
                        title=note.title,
                        snippet=self._snippet(q, note.content_md),
                        score=score,
                        project_id=note.project_id,
                        status=note.kind.value,
                    )
                )

        for item in self._reading.list():
            score = self._score(q, item.title, item.author + " " + item.url, [])
            if score > 0:
                hits.append(
                    SearchHit(
                        kind="reading",
                        id=item.id,
                        title=item.title,
                        snippet=item.author or item.url,
                        score=score,
                        project_id=item.project_id,
                        status=item.status.value,
                    )
                )

        hits.sort(key=lambda h: (-h.score, h.title.lower()))
        return hits[:limit]

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
