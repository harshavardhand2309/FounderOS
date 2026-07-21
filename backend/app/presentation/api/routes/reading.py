from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.presentation.api.deps import ReadingServiceDep
from app.presentation.schemas.misc import ReadingCreate, ReadingRead, ReadingUpdate

router = APIRouter(prefix="/reading", tags=["reading"])


@router.get("", response_model=list[ReadingRead])
def list_items(
    service: ReadingServiceDep,
    item_status: str | None = None,
    project_id: str | None = None,
) -> list[ReadingRead]:
    items = service.list(status=item_status, project_id=project_id)
    return [ReadingRead.model_validate(i) for i in items]


@router.get("/due-reviews", response_model=list[ReadingRead])
def due_reviews(service: ReadingServiceDep) -> list[ReadingRead]:
    return [ReadingRead.model_validate(i) for i in service.due_reviews()]


@router.post("", response_model=ReadingRead, status_code=status.HTTP_201_CREATED)
def create_item(payload: ReadingCreate, service: ReadingServiceDep) -> ReadingRead:
    return ReadingRead.model_validate(service.create(payload.model_dump()))


@router.get("/{item_id}", response_model=ReadingRead)
def get_item(item_id: str, service: ReadingServiceDep) -> ReadingRead:
    item = service.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Reading item not found")
    return ReadingRead.model_validate(item)


@router.patch("/{item_id}", response_model=ReadingRead)
def update_item(item_id: str, payload: ReadingUpdate, service: ReadingServiceDep) -> ReadingRead:
    item = service.update(item_id, payload.model_dump(exclude_unset=True))
    if item is None:
        raise HTTPException(status_code=404, detail="Reading item not found")
    return ReadingRead.model_validate(item)


@router.post("/{item_id}/complete-review", response_model=ReadingRead)
def complete_review(item_id: str, service: ReadingServiceDep) -> ReadingRead:
    item = service.complete_review(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Reading item not found")
    return ReadingRead.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: str, service: ReadingServiceDep) -> None:
    if not service.delete(item_id):
        raise HTTPException(status_code=404, detail="Reading item not found")
