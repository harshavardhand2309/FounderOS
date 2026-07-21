"""Learning system: reading tracker, scores, and spaced revision reminders."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.application.interfaces import ActivityRepositoryProtocol, ReadingRepositoryProtocol
from app.domain.entities import ReadingItem, utcnow
from app.domain.enums import ActivityKind, ReadingStatus

# Spaced-repetition style interval growth on each completed review.
_REVIEW_GROWTH_FACTOR = 2.0
_MAX_REVIEW_INTERVAL_DAYS = 120


class ReadingService:
    def __init__(
        self, reading: ReadingRepositoryProtocol, activity: ActivityRepositoryProtocol
    ) -> None:
        self._reading = reading
        self._activity = activity

    def create(self, data: dict[str, Any]) -> ReadingItem:
        return self._reading.add(ReadingItem(**data))

    def get(self, item_id: str) -> ReadingItem | None:
        return self._reading.get(item_id)

    def list(self, **filters: Any) -> list[ReadingItem]:
        return self._reading.list(**filters)

    def update(self, item_id: str, changes: dict[str, Any]) -> ReadingItem | None:
        item = self._reading.get(item_id)
        if item is None:
            return None
        old_status = item.status
        for field, value in changes.items():
            setattr(item, field, value)
        self._apply_transitions(item, old_status)
        return self._reading.save(item)

    def delete(self, item_id: str) -> bool:
        item = self._reading.get(item_id)
        if item is None:
            return False
        self._reading.delete(item)
        return True

    def due_reviews(self, on: date | None = None) -> list[ReadingItem]:
        return self._reading.due_reviews(on or utcnow().date())

    def complete_review(self, item_id: str) -> ReadingItem | None:
        """A revision session happened: grow the interval and reschedule."""
        item = self._reading.get(item_id)
        if item is None:
            return None
        item.review_interval_days = min(
            _MAX_REVIEW_INTERVAL_DAYS, max(1, int(item.review_interval_days * _REVIEW_GROWTH_FACTOR))
        )
        item.next_review_at = utcnow().date() + timedelta(days=item.review_interval_days)
        return self._reading.save(item)

    def _apply_transitions(self, item: ReadingItem, old_status: ReadingStatus) -> None:
        now = utcnow()
        if item.status == ReadingStatus.READING and item.started_at is None:
            item.started_at = now
        if item.status == ReadingStatus.COMPLETED and old_status != ReadingStatus.COMPLETED:
            item.completed_at = now
            item.progress_pct = 100
            if item.next_review_at is None:
                item.next_review_at = now.date() + timedelta(days=item.review_interval_days)
            self._activity.log(
                ActivityKind.READING_COMPLETED,
                project_id=item.project_id,
                task_id=item.task_id,
                payload={"kind": item.kind.value, "title": item.title},
            )
