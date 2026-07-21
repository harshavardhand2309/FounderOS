"""Task-family repositories: tasks, dependencies, checklists, work sessions."""

from __future__ import annotations

from datetime import date, datetime, time
from collections import defaultdict

from sqlmodel import Session, col, select

from app.domain.entities import (
    KnowledgeChecklist,
    Note,
    PlanEntry,
    ReadingItem,
    Task,
    TaskDependency,
    WorkSession,
    utcnow,
)
from app.domain.enums import TaskStatus


class TaskRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def get(self, task_id: str) -> Task | None:
        return self._s.get(Task, task_id)

    def list(
        self,
        *,
        project_id: str | None = None,
        statuses: list[TaskStatus] | None = None,
        parent_id: str | None = None,
        include_archived: bool = False,
    ) -> list[Task]:
        stmt = select(Task)
        if project_id is not None:
            stmt = stmt.where(Task.project_id == project_id)
        if statuses:
            stmt = stmt.where(col(Task.status).in_(statuses))
        elif not include_archived:
            stmt = stmt.where(Task.status != TaskStatus.ARCHIVED)
        if parent_id is not None:
            stmt = stmt.where(Task.parent_id == parent_id)
        stmt = stmt.order_by(col(Task.sequence), col(Task.created_at))
        return list(self._s.exec(stmt).all())

    def list_all_open(self) -> list[Task]:
        stmt = select(Task).where(col(Task.status).in_(TaskStatus.open_statuses()))
        return list(self._s.exec(stmt).all())

    def subtasks_of(self, task_id: str) -> list[Task]:
        stmt = select(Task).where(Task.parent_id == task_id).order_by(col(Task.created_at))
        return list(self._s.exec(stmt).all())

    def add(self, task: Task) -> Task:
        self._s.add(task)
        self._s.commit()
        self._s.refresh(task)
        return task

    def save(self, task: Task) -> Task:
        task.updated_at = utcnow()
        self._s.add(task)
        self._s.commit()
        self._s.refresh(task)
        return task

    def delete(self, task: Task) -> None:
        # Clean up relational fan-out first: SQLite enforces FKs (PRAGMA
        # foreign_keys=ON) and none of these edges declare ON DELETE CASCADE.
        for dep in self._s.exec(
            select(TaskDependency).where(
                (TaskDependency.task_id == task.id) | (TaskDependency.depends_on_id == task.id)
            )
        ).all():
            self._s.delete(dep)
        for ws in self._s.exec(select(WorkSession).where(WorkSession.task_id == task.id)).all():
            self._s.delete(ws)
        for child in self.subtasks_of(task.id):
            child.parent_id = None
            self._s.add(child)
        # Detach non-owned references; the artifacts outlive the task.
        for note in self._s.exec(select(Note).where(Note.task_id == task.id)).all():
            note.task_id = None
            self._s.add(note)
        for item in self._s.exec(select(ReadingItem).where(ReadingItem.task_id == task.id)).all():
            item.task_id = None
            self._s.add(item)
        for entry in self._s.exec(select(PlanEntry).where(PlanEntry.task_id == task.id)).all():
            entry.task_id = None
            self._s.add(entry)
        self._s.delete(task)
        self._s.commit()

    def completed_samples(self, task_type: str, limit: int) -> list[tuple[int, int]]:
        """(estimated, actual) minutes of recently completed tasks of a type."""
        stmt = (
            select(Task)
            .where(Task.status == TaskStatus.DONE)
            .where(Task.task_type == task_type)
            .where(col(Task.estimated_minutes).is_not(None))
            .where(Task.actual_minutes > 0)
            .order_by(col(Task.completed_at).desc())
            .limit(limit)
        )
        return [(t.estimated_minutes or 0, t.actual_minutes) for t in self._s.exec(stmt).all()]

    def completed_between(self, start: datetime, end: datetime) -> list[Task]:
        stmt = (
            select(Task)
            .where(Task.status == TaskStatus.DONE)
            .where(col(Task.completed_at).is_not(None))
            .where(Task.completed_at >= start)
            .where(Task.completed_at < end)
        )
        return list(self._s.exec(stmt).all())

    def max_sequence(self, status: TaskStatus) -> float:
        stmt = select(Task).where(Task.status == status).order_by(col(Task.sequence).desc()).limit(1)
        last = self._s.exec(stmt).first()
        return last.sequence if last else 0.0


class DependencyRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def list_all(self) -> list[TaskDependency]:
        return list(self._s.exec(select(TaskDependency)).all())

    def for_task(self, task_id: str) -> list[TaskDependency]:
        stmt = select(TaskDependency).where(TaskDependency.task_id == task_id)
        return list(self._s.exec(stmt).all())

    def add(self, dependency: TaskDependency) -> TaskDependency:
        self._s.add(dependency)
        self._s.commit()
        self._s.refresh(dependency)
        return dependency

    def remove(self, task_id: str, depends_on_id: str) -> bool:
        stmt = select(TaskDependency).where(
            TaskDependency.task_id == task_id, TaskDependency.depends_on_id == depends_on_id
        )
        dep = self._s.exec(stmt).first()
        if dep is None:
            return False
        self._s.delete(dep)
        self._s.commit()
        return True


class ChecklistRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def for_task(self, task_id: str) -> KnowledgeChecklist | None:
        stmt = select(KnowledgeChecklist).where(KnowledgeChecklist.task_id == task_id)
        return self._s.exec(stmt).first()

    def add(self, checklist: KnowledgeChecklist) -> KnowledgeChecklist:
        self._s.add(checklist)
        self._s.commit()
        self._s.refresh(checklist)
        return checklist

    def save(self, checklist: KnowledgeChecklist) -> KnowledgeChecklist:
        checklist.updated_at = utcnow()
        self._s.add(checklist)
        self._s.commit()
        self._s.refresh(checklist)
        return checklist


class WorkSessionRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def for_task(self, task_id: str) -> list[WorkSession]:
        stmt = (
            select(WorkSession)
            .where(WorkSession.task_id == task_id)
            .order_by(col(WorkSession.started_at))
        )
        return list(self._s.exec(stmt).all())

    def add(self, session: WorkSession) -> WorkSession:
        self._s.add(session)
        self._s.commit()
        self._s.refresh(session)
        return session

    def between(self, start: date, end: date) -> list[WorkSession]:
        start_dt = datetime.combine(start, time.min)
        end_dt = datetime.combine(end, time.max)
        stmt = select(WorkSession).where(
            WorkSession.started_at >= start_dt, WorkSession.started_at <= end_dt
        )
        return list(self._s.exec(stmt).all())

    def minutes_by_day(self, start: date, end: date) -> dict[date, int]:
        totals: dict[date, int] = defaultdict(int)
        for ws in self.between(start, end):
            totals[ws.started_at.date()] += ws.minutes
        return dict(totals)
