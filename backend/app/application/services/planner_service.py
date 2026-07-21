"""Daily planning orchestration: generate/replan a day, manage entries,
and roll unfinished work forward."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from app.application.engines.dependencies import DependencyEngine
from app.application.engines.planner import PlannableTask, PlannerEngine
from app.application.engines.workload import remaining_minutes_for
from app.application.interfaces import (
    ActivityRepositoryProtocol,
    DependencyRepositoryProtocol,
    PrefsRepositoryProtocol,
    ReadingRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.core.logging import get_logger
from app.domain.entities import DayPlan, PlanEntry, utcnow
from app.domain.enums import (
    ActivityKind,
    PlanEntryKind,
    PlanEntryStatus,
    ReadingStatus,
    TaskStatus,
)
from app.infrastructure.repositories.misc import PlanRepository

logger = get_logger("planner")

_PLANNABLE_STATUSES = (TaskStatus.READY, *TaskStatus.working_statuses())


def _parse_day_start(value: str) -> int:
    try:
        hours, minutes = value.split(":", 1)
        return int(hours) * 60 + int(minutes)
    except (ValueError, AttributeError):
        return 9 * 60


class PlannerService:
    def __init__(
        self,
        plans: PlanRepository,
        tasks: TaskRepositoryProtocol,
        deps: DependencyRepositoryProtocol,
        prefs: PrefsRepositoryProtocol,
        reading: ReadingRepositoryProtocol,
        activity: ActivityRepositoryProtocol,
        engine: PlannerEngine,
        dependency_engine: DependencyEngine,
    ) -> None:
        self._plans = plans
        self._tasks = tasks
        self._deps = deps
        self._prefs = prefs
        self._reading = reading
        self._activity = activity
        self._engine = engine
        self._dep_engine = dependency_engine

    # Generation -----------------------------------------------------------

    def generate(self, plan_date: date, available_minutes: int | None = None) -> DayPlan:
        """(Re)generate the plan for a date. Locked and completed entries are
        preserved; everything else is rebuilt from current priorities."""
        prefs = self._prefs.get()
        if available_minutes is None:
            available_minutes = int(prefs.available_hours * 60)
        day_start = _parse_day_start(prefs.day_start)

        existing = self._plans.for_date(plan_date)
        carried: list[PlanEntry] = []
        if existing is not None:
            carried = [
                e
                for e in existing.entries
                if e.locked or e.status in (PlanEntryStatus.DONE, PlanEntryStatus.IN_PROGRESS)
            ]
            carried_specs = [
                dict(
                    task_id=e.task_id,
                    kind=e.kind,
                    session_type=e.session_type,
                    title=e.title,
                    start_minute=e.start_minute,
                    duration_minutes=e.duration_minutes,
                    status=e.status,
                    locked=e.locked,
                )
                for e in carried
            ]
            self._plans.delete(existing)
        else:
            carried_specs = []

        carried_focus_minutes = sum(
            spec["duration_minutes"]
            for spec in carried_specs
            if spec["kind"] in (PlanEntryKind.FOCUS, PlanEntryKind.LEARNING)
        )
        carried_task_ids = {spec["task_id"] for spec in carried_specs if spec["task_id"]}
        cursor_after_carried = max(
            [day_start] + [spec["start_minute"] + spec["duration_minutes"] for spec in carried_specs]
        )

        candidates = self._candidates(exclude_ids=carried_task_ids)
        include_learning = bool(self._reading.list(status=ReadingStatus.READING.value))

        result = self._engine.build_day(
            candidates,
            available_minutes=max(0, available_minutes - carried_focus_minutes),
            day_start_minute=cursor_after_carried,
            include_learning_slot=include_learning,
        )

        plan = DayPlan(
            plan_date=plan_date,
            available_minutes=available_minutes,
            buffer_minutes=result.buffer_minutes,
            notes=(
                f"{len(result.unplanned_task_ids)} task(s) deferred beyond today"
                if result.unplanned_task_ids
                else ""
            ),
        )
        plan = self._plans.add(plan)

        for spec in carried_specs:
            self._plans.save_entry(PlanEntry(plan_id=plan.id, **spec))
        for entry_spec in result.entries:
            self._plans.save_entry(
                PlanEntry(
                    plan_id=plan.id,
                    task_id=entry_spec.task_id,
                    kind=entry_spec.kind,
                    session_type=entry_spec.session_type,
                    title=entry_spec.title,
                    start_minute=entry_spec.start_minute,
                    duration_minutes=entry_spec.duration_minutes,
                )
            )

        self._activity.log(
            ActivityKind.PLAN_GENERATED,
            payload={
                "date": plan_date.isoformat(),
                "work_minutes": result.work_minutes,
                "unplanned": len(result.unplanned_task_ids),
            },
        )
        refreshed = self._plans.for_date(plan_date)
        assert refreshed is not None
        return refreshed

    def _candidates(self, exclude_ids: set[str] | None = None) -> list[PlannableTask]:
        open_tasks = self._tasks.list_all_open()
        analysis = self._dep_engine.analyze(open_tasks, self._deps.list_all())
        exclude = exclude_ids or set()
        candidates = []
        for task in open_tasks:
            if task.status not in _PLANNABLE_STATUSES:
                continue
            if task.id in analysis.blocked_task_ids or task.id in exclude:
                continue
            remaining = remaining_minutes_for(task)
            if remaining <= 0:
                continue
            candidates.append(
                PlannableTask(
                    id=task.id,
                    title=task.title,
                    project_id=task.project_id,
                    task_type=task.task_type,
                    priority_score=task.priority_score,
                    remaining_minutes=remaining,
                    deep_work=task.deep_work,
                )
            )
        return candidates

    # Reads / entry updates ------------------------------------------------

    def get_plan(self, plan_date: date) -> DayPlan | None:
        return self._plans.for_date(plan_date)

    def update_entry(
        self,
        entry_id: str,
        *,
        status: PlanEntryStatus | None = None,
        locked: bool | None = None,
    ) -> PlanEntry | None:
        entry = self._plans.get_entry(entry_id)
        if entry is None:
            return None
        if status is not None:
            entry.status = status
        if locked is not None:
            entry.locked = locked
        return self._plans.save_entry(entry)

    # Rollover -------------------------------------------------------------

    def rollover(self, up_to: date | None = None) -> int:
        """Mark past unfinished entries as moved. Their tasks remain open, so
        the next generate() automatically reschedules them. Returns count."""
        today = up_to or utcnow().date()
        moved = 0
        for days_back in range(1, 8):
            plan = self._plans.for_date(today - timedelta(days=days_back))
            if plan is None:
                continue
            for entry in plan.entries:
                if entry.kind in (PlanEntryKind.FOCUS, PlanEntryKind.LEARNING) and entry.status in (
                    PlanEntryStatus.PLANNED,
                    PlanEntryStatus.IN_PROGRESS,
                ):
                    entry.status = PlanEntryStatus.MOVED
                    self._plans.save_entry(entry)
                    moved += 1
        if moved:
            self._activity.log(ActivityKind.PLAN_ROLLED_OVER, payload={"entries": moved})
            logger.info("Rolled over %d unfinished plan entries", moved)
        return moved
