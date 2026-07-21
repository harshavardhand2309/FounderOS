from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.presentation.api.deps import NoteServiceDep
from app.presentation.schemas.misc import NoteCreate, NoteRead, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteRead])
def list_notes(
    service: NoteServiceDep,
    kind: str | None = None,
    task_id: str | None = None,
    project_id: str | None = None,
    tag: str | None = None,
) -> list[NoteRead]:
    notes = service.list(kind=kind, task_id=task_id, project_id=project_id, tag=tag)
    return [NoteRead.model_validate(n) for n in notes]


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(payload: NoteCreate, service: NoteServiceDep) -> NoteRead:
    return NoteRead.model_validate(service.create(payload.model_dump()))


@router.get("/{note_id}", response_model=NoteRead)
def get_note(note_id: str, service: NoteServiceDep) -> NoteRead:
    note = service.get(note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return NoteRead.model_validate(note)


@router.patch("/{note_id}", response_model=NoteRead)
def update_note(note_id: str, payload: NoteUpdate, service: NoteServiceDep) -> NoteRead:
    note = service.update(note_id, payload.model_dump(exclude_unset=True))
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return NoteRead.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: str, service: NoteServiceDep) -> None:
    if not service.delete(note_id):
        raise HTTPException(status_code=404, detail="Note not found")
