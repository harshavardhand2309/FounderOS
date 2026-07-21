"""Task orchestration: CRUD, estimation, prioritization, dependencies,
status transitions, work logging and the learning checklist."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from app.application.engines.dependencies import DependencyAnalysis, DependencyEngine
from app.application.engines.estimation import EstimationEngine, HistorySample
from app.application.engines.knowledge import CHECKLIST_FIELDS, KnowledgeScorer
from app.application.engines.priority import PriorityContext, PriorityEngine
from app.application.interfaces import (
    ActivityRepositoryProtocol,
    ChecklistRepositoryProtocol,
    DependencyRepositoryProtocol,
    ProjectRepositoryProtocol,
    TaskRepositoryProtocol,
    WorkSessionRepositoryProtocol,
)
from app.core.logging import get_logger
from app.domain.entities import KnowledgeChecklist, Task, TaskDependency, WorkSession, utcnow
from app.domain.enums import (
    ActivityKind,
    EstimateSource,
    Priority,
    TaskStatus,
    TaskType,
)

logger = get_logger("tasks")

_HISTORY_LIMIT = 20
# Fields whose change invalidates a non-manual estimate.
_ESTIMATE_INPUTS = {"task_type", "complexity", "difficulty", "knowledge_value"}
# Research-flavored work automatically gets a learning checklist.
_LEARNING_TASK_TYPES = {TaskType.RESEARCH, TaskType.READING}


class CycleError(ValueError):
    """Raised when adding a dependency would create a cycle."""


class TaskService:
    def __init__(
        self,
        tasks: TaskRepositoryProtocol,
        deps: DependencyRepositoryProtocol,
        checklists: ChecklistRepositoryProtocol,
        sessions: WorkSessionRepositoryProtocol,
        projects: ProjectRepositoryProtocol,
        activity: ActivityRepositoryProtocol,
        estimator: EstimationEngine,
        prioritizer: PriorityEngine,
        dependency_engine: DependencyEngine,
        knowledge: KnowledgeScorer,
    ) -> None:
        self._tasks = tasks
        self._deps = deps
        self._checklists = checklists
        self._sessions = sessions
        self._projects = projects
        self._activity = activity
        self._estimator = estimator
        self._prioritizer = prioritizer
        self._dep_engine = dependency_engine
        self._knowledge = knowledge

    # CRUD -----------------------------------------------------------------

    def create(self, data: dict[str, Any]) -> Task:
        task = Task(**data)
        if task.estimated_minutes is None:
            self._apply_estimate(task)
        task.sequence = self._tasks.max_sequence(task.status) + 1.0
        task = self._tasks.add(task)

        if self._needs_checklist(task):
            self._checklists.add(KnowledgeChecklist(task_id=task.id))

        self._activity.log(ActivityKind.TASK_CREATED, task_id=task.id, project_id=task.project_id)
        self.recalculate_priorities()
        return self._tasks.get(task.id) or task

    def get(self, task_id: str) -> Task | None:
        return self._tasks.get(task_id)

    def update(self, task_id: str, changes: dict[str, Any]) -> Task | None:
        task = self._tasks.get(task_id)
        if task is None:
            return None

        old_status = task.status
        estimate_touched = bool(_ESTIMATE_INPUTS & changes.keys())
        manual_estimate = "estimated_minutes" in changes and changes["estimated_minutes"] is not None

        for field, value in changes.items():
            setattr(task, field, value)

        if manual_estimate:
            task.estimate_source = EstimateSource.MANUAL
            if "estimate_optimistic" not in changes:
                task.estimate_optimistic = None
            if "estimate_pessimistic" not in changes:
                task.estimate_pessimistic = None
        elif estimate_touched and task.estimate_source != EstimateSource.MANUAL:
            self._apply_estimate(task)

        if "status" in changes and task.status != old_status:
            self._on_status_change(task, old_status)

        task = self._tasks.save(task)

        if self._needs_checklist(task) and self._checklists.for_task(task.id) is None:
            self._checklists.add(KnowledgeChecklist(task_id=task.id))

        self.recalculate_priorities()
        self.refresh_blocked_statuses()
        return self._tasks.get(task.id)

    def delete(self, task_id: str) -> bool:
        task = self._tasks.get(task_id)
        if task is None:
            return False
        self._tasks.delete(task)
        self.recalculate_priorities()
        return True

    def move(self, task_id: str, status: TaskStatus, before_sequence: float | None = None) -> Task | None:
        """Kanban drag/drop: change column and/or position."""
        task = self._tasks.get(task_id)
        if task is None:
            return None
        old_status = task.status
        # Resolve the target sequence BEFORE mutating the task: autoflush would
        # otherwise include the moved task itself in the max_sequence query.
        new_sequence = (
            before_sequence if before_sequence is not None else self._tasks.max_sequence(status) + 1.0
        )
        task.status = status
        task.sequence = new_sequence
        if status != old_status:
            self._on_status_change(task, old_status)
        task = self._tasks.save(task)
        self.recalculate_priorities()
        self.refresh_blocked_statuses()
        return self._tasks.get(task.id)

    def list(self, **filters: Any) -> list[Task]:
        return self._tasks.list(**filters)

    def subtasks(self, task_id: str) -> list[Task]:
        return self._tasks.subtasks_of(task_id)

    # Estimation -----------------------------------------------------------

    def reestimate(self, task_id: str) -> Task | None:
        task = self._tasks.get(task_id)
        if task is None:
            return None
        self._apply_estimate(task)
        return self._tasks.save(task)

    def _apply_estimate(self, task: Task) -> None:
        samples = [
            HistorySample(estimated_minutes=est, actual_minutes=act)
            for est, act in self._tasks.completed_samples(task.task_type.value, _HISTORY_LIMIT)
        ]
        result = self._estimator.estimate(task, samples)
        task.estimated_minutes = result.realistic
        task.estimate_optimistic = result.optimistic
        task.estimate_pessimistic = result.pessimistic
        task.estimate_confidence = result.confidence
        task.estimate_source = result.source

    # Priorities & dependencies -------------------------------------------

    def analyze_dependencies(self) -> DependencyAnalysis:
        return self._dep_engine.analyze(self._tasks.list_all_open(), self._deps.list_all())

    def recalculate_priorities(self) -> int:
        """Recompute priority_score for all open tasks. Returns count updated."""
        open_tasks = self._tasks.list_all_open()
        analysis = self._dep_engine.analyze(open_tasks, self._deps.list_all())
        projects = {p.id: p for p in self._projects.list(include_archived=True)}
        now = utcnow()
        updated = 0
        for task in open_tasks:
            project = projects.get(task.project_id) if task.project_id else None
            ctx = PriorityContext(
                now=now,
                unblocks_count=len(analysis.unblocks_map.get(task.id, [])),
                project_priority=project.priority if project else None,
                project_deadline=(
                    datetime.combine(project.deadline, datetime.min.time())
                    if project and project.deadline
                    else None
                ),
                is_blocked=task.id in analysis.blocked_task_ids,
            )
            new_score = self._prioritizer.score(task, ctx).score
            if abs(new_score - task.priority_score) >= 0.05:
                task.priority_score = new_score
                self._tasks.save(task)
                updated += 1
        return updated

    def refresh_blocked_statuses(self) -> dict[str, list[str]]:
        """Auto-block tasks with unmet dependencies; auto-unblock resolved ones."""
        open_tasks = self._tasks.list_all_open()
        analysis = self._dep_engine.analyze(open_tasks, self._deps.list_all())
        by_id = {t.id: t for t in open_tasks}
        blocked: list[str] = []
        unblocked: list[str] = []

        for task in open_tasks:
            unmet = analysis.blocking_map.get(task.id, [])
            if unmet and task.status in (TaskStatus.READY, *TaskStatus.working_statuses()):
                titles = [by_id[d].title for d in unmet if d in by_id]
                task.status = TaskStatus.BLOCKED
                task.blocked_reason = "Waiting on: " + ", ".join(titles[:3])
                self._tasks.save(task)
                blocked.append(task.id)
            elif not unmet and task.status == TaskStatus.BLOCKED and task.blocked_reason and task.blocked_reason.startswith("Waiting on:"):
                # Only auto-unblock tasks *we* auto-blocked; manual blocks stay.
                task.status = TaskStatus.READY
                task.blocked_reason = None
                self._tasks.save(task)
                unblocked.append(task.id)

        return {"blocked": blocked, "unblocked": unblocked}

    def add_dependency(self, task_id: str, depends_on_id: str) -> TaskDependency:
        if self._tasks.get(task_id) is None or self._tasks.get(depends_on_id) is None:
            raise KeyError("Both tasks must exist")
        edges = self._deps.list_all()
        if any(e.task_id == task_id and e.depends_on_id == depends_on_id for e in edges):
            raise ValueError("Dependency already exists")
        if self._dep_engine.would_create_cycle(edges, task_id, depends_on_id):
            raise CycleError("Dependency would create a cycle")
        dep = self._deps.add(TaskDependency(task_id=task_id, depends_on_id=depends_on_id))
        self.refresh_blocked_statuses()
        self.recalculate_priorities()
        return dep

    def remove_dependency(self, task_id: str, depends_on_id: str) -> bool:
        removed = self._deps.remove(task_id, depends_on_id)
        if removed:
            self.refresh_blocked_statuses()
            self.recalculate_priorities()
        return removed

    def dependencies_of(self, task_id: str) -> list[TaskDependency]:
        return self._deps.for_task(task_id)

    # Work logging ---------------------------------------------------------

    def log_work(
        self,
        task_id: str,
        minutes: int,
        deep_work: bool = False,
        session_type: TaskType | None = None,
        note: str = "",
    ) -> Task | None:
        task = self._tasks.get(task_id)
        if task is None or minutes <= 0:
            return None
        now = utcnow()
        self._sessions.add(
            WorkSession(
                task_id=task_id,
                started_at=now - timedelta(minutes=minutes),
                ended_at=now,
                minutes=minutes,
                deep_work=deep_work,
                session_type=session_type or task.task_type,
                note=note,
            )
        )
        task.actual_minutes += minutes
        task = self._tasks.save(task)
        self._activity.log(
            ActivityKind.SESSION_LOGGED,
            task_id=task_id,
            project_id=task.project_id,
            payload={"minutes": minutes, "deep_work": deep_work},
        )
        return task

    # Learning checklist ---------------------------------------------------

    def get_checklist(self, task_id: str) -> KnowledgeChecklist | None:
        checklist = self._checklists.for_task(task_id)
        if checklist is None and self._tasks.get(task_id) is not None:
            checklist = self._checklists.add(KnowledgeChecklist(task_id=task_id))
        return checklist

    def update_checklist(self, task_id: str, flags: dict[str, bool]) -> KnowledgeChecklist | None:
        checklist = self.get_checklist(task_id)
        if checklist is None:
            return None
        for field, value in flags.items():
            if field in CHECKLIST_FIELDS:
                setattr(checklist, field, bool(value))
        checklist = self._checklists.save(checklist)

        task = self._tasks.get(task_id)
        if task is not None:
            task.learning_score = self._knowledge.score(checklist)
            self._tasks.save(task)
        return checklist

    # Internals ------------------------------------------------------------

    def _needs_checklist(self, task: Task) -> bool:
        return task.task_type in _LEARNING_TASK_TYPES or task.knowledge_value >= 4

    def _on_status_change(self, task: Task, old_status: TaskStatus) -> None:
        if task.status == TaskStatus.DONE and old_status != TaskStatus.DONE:
            task.completed_at = utcnow()
            if task.actual_minutes == 0 and task.estimated_minutes:
                # No sessions logged: assume the estimate so history stays useful.
                task.actual_minutes = task.estimated_minutes
            self._activity.log(
                ActivityKind.TASK_COMPLETED,
                task_id=task.id,
                project_id=task.project_id,
                payload={"estimated": task.estimated_minutes, "actual": task.actual_minutes},
            )
            if task.recurrence:
                self._spawn_recurrence(task)
        elif old_status == TaskStatus.DONE and task.status != TaskStatus.DONE:
            task.completed_at = None
        if task.status != TaskStatus.BLOCKED and old_status == TaskStatus.BLOCKED:
            task.blocked_reason = None
        self._activity.log(
            ActivityKind.STATUS_CHANGED,
            task_id=task.id,
            project_id=task.project_id,
            payload={"from": old_status.value, "to": task.status.value},
        )

    def _spawn_recurrence(self, task: Task) -> None:
        """Clone a completed recurring task into the backlog with a shifted deadline."""
        interval = _recurrence_interval(task.recurrence or "")
        if interval is None:
            logger.warning("Unknown recurrence '%s' on task %s", task.recurrence, task.id)
            return
        clone = Task(
            title=task.title,
            description=task.description,
            project_id=task.project_id,
            epic_id=task.epic_id,
            status=TaskStatus.BACKLOG,
            task_type=task.task_type,
            priority=task.priority if task.priority != Priority.NONE else Priority.NONE,
            difficulty=task.difficulty,
            importance=task.importance,
            complexity=task.complexity,
            knowledge_value=task.knowledge_value,
            estimated_minutes=task.estimated_minutes,
            estimate_optimistic=task.estimate_optimistic,
            estimate_pessimistic=task.estimate_pessimistic,
            estimate_confidence=task.estimate_confidence,
            estimate_source=task.estimate_source,
            risk_level=task.risk_level,
            energy_required=task.energy_required,
            deep_work=task.deep_work,
            labels=list(task.labels or []),
            tags=list(task.tags or []),
            recurrence=task.recurrence,
            deadline=(task.deadline + interval) if task.deadline else (utcnow() + interval),
        )
        clone.sequence = self._tasks.max_sequence(TaskStatus.BACKLOG) + 1.0
        self._tasks.add(clone)


def _recurrence_interval(spec: str) -> timedelta | None:
    """Map a recurrence spec ("daily", "weekly", "weekly:mon", "monthly") to a delta."""
    base = spec.split(":", 1)[0].strip().lower()
    return {
        "daily": timedelta(days=1),
        "weekly": timedelta(weeks=1),
        "biweekly": timedelta(weeks=2),
        "monthly": timedelta(days=30),
    }.get(base)
