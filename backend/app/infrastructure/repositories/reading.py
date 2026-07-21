"""Reading tracker repository."""

from __future__ import annotations

from datetime import date

from sqlmodel import Session, col, select

from app.domain.entities import ReadingItem, utcnow
from app.domain.enums import ReadingStatus


class ReadingRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, item_id: str) -> ReadingItem | None:
        return self._s.get(ReadingItem, item_id)

    def list(
        self, *, status: str | None = None, project_id: str | None = None
    ) -> list[ReadingItem]:
        stmt = select(ReadingItem)
        if status:
            stmt = stmt.where(ReadingItem.status == status)
        if project_id:
            stmt = stmt.where(ReadingItem.project_id == project_id)
        stmt = stmt.order_by(col(ReadingItem.updated_at).desc())
        return list(self._s.exec(stmt).all())

    def due_reviews(self, on_or_before: date) -> list[ReadingItem]:
        stmt = (
            select(ReadingItem)
            .where(ReadingItem.status == ReadingStatus.COMPLETED)
            .where(col(ReadingItem.next_review_at).is_not(None))
            .where(ReadingItem.next_review_at <= on_or_before)
            .order_by(col(ReadingItem.next_review_at))
        )
        return list(self._s.exec(stmt).all())

    def add(self, item: ReadingItem) -> ReadingItem:
        self._s.add(item)
        self._s.commit()
        self._s.refresh(item)
        return item

    def save(self, item: ReadingItem) -> ReadingItem:
        item.updated_at = utcnow()
        self._s.add(item)
        self._s.commit()
        self._s.refresh(item)
        return item

    def delete(self, item: ReadingItem) -> None:
        self._s.delete(item)
        self._s.commit()
