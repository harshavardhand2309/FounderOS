"""Knowledge system: notes, summaries, decision logs, ADRs."""

from __future__ import annotations

from typing import Any

from app.application.interfaces import ActivityRepositoryProtocol, NoteRepositoryProtocol
from app.domain.entities import Note
from app.domain.enums import ActivityKind


class NoteService:
    def __init__(self, notes: NoteRepositoryProtocol, activity: ActivityRepositoryProtocol) -> None:
        self._notes = notes
        self._activity = activity

    def create(self, data: dict[str, Any]) -> Note:
        note = self._notes.add(Note(**data))
        self._activity.log(
            ActivityKind.NOTE_CREATED,
            task_id=note.task_id,
            project_id=note.project_id,
            payload={"kind": note.kind.value},
        )
        return note

    def get(self, note_id: str) -> Note | None:
        return self._notes.get(note_id)

    def list(self, **filters: Any) -> list[Note]:
        return self._notes.list(**filters)

    def update(self, note_id: str, changes: dict[str, Any]) -> Note | None:
        note = self._notes.get(note_id)
        if note is None:
            return None
        for field, value in changes.items():
            setattr(note, field, value)
        return self._notes.save(note)

    def delete(self, note_id: str) -> bool:
        note = self._notes.get(note_id)
        if note is None:
            return False
        self._notes.delete(note)
        return True
