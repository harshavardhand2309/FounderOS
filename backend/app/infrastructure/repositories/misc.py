"""Plan, preferences and activity-log repositories."""

from __future__ import annotations

from datetime import date, datetime

from sqlmodel import Session, col, select

from app.domain.entities import ActivityLog, DayPlan, Embedding, PlanEntry, UserPrefs
from app.domain.enums import ActivityKind, PlanEntryKind


class PlanRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def for_date(self, plan_date: date) -> DayPlan | None:
        stmt = select(DayPlan).where(DayPlan.plan_date == plan_date)
        return self._s.exec(stmt).first()

    def add(self, plan: DayPlan) -> DayPlan:
        self._s.add(plan)
        self._s.commit()
        self._s.refresh(plan)
        return plan

    def save(self, plan: DayPlan) -> DayPlan:
        self._s.add(plan)
        self._s.commit()
        self._s.refresh(plan)
        return plan

    def delete(self, plan: DayPlan) -> None:
        self._s.delete(plan)
        self._s.commit()

    def get_entry(self, entry_id: str) -> PlanEntry | None:
        return self._s.get(PlanEntry, entry_id)

    def save_entry(self, entry: PlanEntry) -> PlanEntry:
        self._s.add(entry)
        self._s.commit()
        self._s.refresh(entry)
        return entry

    def planned_minutes_for(self, plan_date: date) -> int:
        plan = self.for_date(plan_date)
        if plan is None:
            return 0
        return sum(
            e.duration_minutes
            for e in plan.entries
            if e.kind in (PlanEntryKind.FOCUS, PlanEntryKind.LEARNING)
        )


class PrefsRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self) -> UserPrefs:
        prefs = self._s.get(UserPrefs, 1)
        if prefs is None:
            prefs = UserPrefs(id=1)
            self._s.add(prefs)
            self._s.commit()
            self._s.refresh(prefs)
        return prefs

    def save(self, prefs: UserPrefs) -> UserPrefs:
        prefs.id = 1  # single-user: exactly one row
        self._s.add(prefs)
        self._s.commit()
        self._s.refresh(prefs)
        return prefs


class EmbeddingRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def list_all(self) -> list[Embedding]:
        return list(self._s.exec(select(Embedding)).all())

    def get(self, embedding_id: str) -> Embedding | None:
        return self._s.get(Embedding, embedding_id)

    def save(self, embedding: Embedding) -> Embedding:
        self._s.add(embedding)
        self._s.commit()
        self._s.refresh(embedding)
        return embedding

    def count(self) -> int:
        return len(self._s.exec(select(Embedding.id)).all())

    def delete_orphans(self, live_ids: set[str]) -> int:
        """Remove vectors whose source entity no longer exists."""
        removed = 0
        for row in self.list_all():
            if row.id not in live_ids:
                self._s.delete(row)
                removed += 1
        if removed:
            self._s.commit()
        return removed


class ActivityRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def log(
        self,
        kind: ActivityKind,
        *,
        task_id: str | None = None,
        project_id: str | None = None,
        payload: dict | None = None,
    ) -> ActivityLog:
        entry = ActivityLog(kind=kind, task_id=task_id, project_id=project_id, payload=payload or {})
        self._s.add(entry)
        self._s.commit()
        self._s.refresh(entry)
        return entry

    def between(self, start: datetime, end: datetime) -> list[ActivityLog]:
        stmt = (
            select(ActivityLog)
            .where(ActivityLog.ts >= start, ActivityLog.ts < end)
            .order_by(col(ActivityLog.ts))
        )
        return list(self._s.exec(stmt).all())
