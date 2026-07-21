"""Note repository."""

from __future__ import annotations

from sqlmodel import Session, col, select

from app.domain.entities import Note, utcnow


class NoteRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, note_id: str) -> Note | None:
        return self._s.get(Note, note_id)

    def list(
        self,
        *,
        kind: str | None = None,
        task_id: str | None = None,
        project_id: str | None = None,
        tag: str | None = None,
    ) -> list[Note]:
        stmt = select(Note)
        if kind:
            stmt = stmt.where(Note.kind == kind)
        if task_id:
            stmt = stmt.where(Note.task_id == task_id)
        if project_id:
            stmt = stmt.where(Note.project_id == project_id)
        stmt = stmt.order_by(col(Note.updated_at).desc())
        notes = list(self._s.exec(stmt).all())
        if tag:
            notes = [n for n in notes if tag in (n.tags or [])]
        return notes

    def by_source_path(self, source_path: str) -> Note | None:
        stmt = select(Note).where(Note.source_path == source_path)
        return self._s.exec(stmt).first()

    def add(self, note: Note) -> Note:
        self._s.add(note)
        self._s.commit()
        self._s.refresh(note)
        return note

    def save(self, note: Note) -> Note:
        note.updated_at = utcnow()
        self._s.add(note)
        self._s.commit()
        self._s.refresh(note)
        return note

    def delete(self, note: Note) -> None:
        self._s.delete(note)
        self._s.commit()
