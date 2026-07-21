"""Dashboard aggregation: overview stats and chart series."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

from app.application.engines.workload import WorkloadEngine, remaining_minutes_for
from app.application.interfaces import (
    PrefsRepositoryProtocol,
    ReadingRepositoryProtocol,
    TaskRepositoryProtocol,
    WorkSessionRepositoryProtocol,
)
from app.domain.entities import utcnow
from app.domain.enums import PlanEntryKind, PlanEntryStatus, TaskStatus, TaskType
from app.infrastructure.repositories.misc import PlanRepository

_VELOCITY_WINDOW_DAYS = 30
_FOCUS_WINDOW_DAYS = 14
_HEATMAP_WEEKS = 13


@dataclass(frozen=True)
class TodaySummary:
    planned_focus_minutes: int
    completed_focus_minutes: int
    deep_work_minutes: int
    learning_minutes: int
    break_minutes: int
    buffer_minutes: int
    entries_total: int
    entries_done: int


@dataclass(frozen=True)
class DashboardOverview:
    today: TodaySummary
    total_remaining_minutes: int
    burn_rate_minutes_per_day: float
    projected_completion: date | None
    overloaded_today: bool
    overload_ratio: float
    open_tasks: int
    blocked_tasks: int
    overdue_tasks: int
    done_this_week: int
    velocity_tasks_per_day: float
    avg_knowledge_score: float
    reading_in_progress: int
    reviews_due: int
    focus_distribution: dict[str, int] = field(default_factory=dict)


class DashboardService:
    def __init__(
        self,
        tasks: TaskRepositoryProtocol,
        sessions: WorkSessionRepositoryProtocol,
        plans: PlanRepository,
        prefs: PrefsRepositoryProtocol,
        reading: ReadingRepositoryProtocol,
        workload: WorkloadEngine,
    ) -> None:
        self._tasks = tasks
        self._sessions = sessions
        self._plans = plans
        self._prefs = prefs
        self._reading = reading
        self._workload = workload

    def overview(self) -> DashboardOverview:
        now = utcnow()
        today = now.date()
        prefs = self._prefs.get()

        today_summary = self._today_summary(today)
        open_tasks = self._tasks.list_all_open()
        completed_by_day = self._sessions.minutes_by_day(
            today - timedelta(days=_FOCUS_WINDOW_DAYS), today
        )
        report = self._workload.report(
            open_tasks=open_tasks,
            completed_minutes_by_day=completed_by_day,
            daily_capacity_minutes=int(prefs.available_hours * 60),
            planned_today_minutes=today_summary.planned_focus_minutes,
            today=today,
        )

        week_start = now - timedelta(days=7)
        done_week = self._tasks.completed_between(week_start, now + timedelta(days=1))
        velocity_window = self._tasks.completed_between(
            now - timedelta(days=_VELOCITY_WINDOW_DAYS), now + timedelta(days=1)
        )

        knowledge_tasks = [
            t for t in open_tasks + velocity_window if t.knowledge_value >= 3
        ]
        avg_knowledge = (
            sum(t.learning_score for t in knowledge_tasks) / len(knowledge_tasks)
            if knowledge_tasks
            else 0.0
        )

        return DashboardOverview(
            today=today_summary,
            total_remaining_minutes=report.total_remaining_minutes,
            burn_rate_minutes_per_day=report.burn_rate_minutes_per_day,
            projected_completion=report.projected_completion,
            overloaded_today=report.overloaded_today,
            overload_ratio=report.overload_ratio,
            open_tasks=len(open_tasks),
            blocked_tasks=len([t for t in open_tasks if t.status == TaskStatus.BLOCKED]),
            overdue_tasks=len(
                [t for t in open_tasks if t.deadline is not None and t.deadline < now]
            ),
            done_this_week=len(done_week),
            velocity_tasks_per_day=round(len(velocity_window) / _VELOCITY_WINDOW_DAYS, 2),
            avg_knowledge_score=round(avg_knowledge, 1),
            reading_in_progress=len(self._reading.list(status="reading")),
            reviews_due=len(self._reading.due_reviews(today)),
            focus_distribution=self._focus_distribution(today),
        )

    def charts(self) -> dict:
        now = utcnow()
        today = now.date()
        days = [today - timedelta(days=i) for i in range(_VELOCITY_WINDOW_DAYS - 1, -1, -1)]

        completed = self._tasks.completed_between(
            now - timedelta(days=_VELOCITY_WINDOW_DAYS + 1), now + timedelta(days=1)
        )
        done_by_day: dict[date, list] = {}
        for task in completed:
            if task.completed_at is not None:
                done_by_day.setdefault(task.completed_at.date(), []).append(task)

        velocity = [
            {
                "date": d.isoformat(),
                "tasks_done": len(done_by_day.get(d, [])),
                "minutes": sum(t.actual_minutes for t in done_by_day.get(d, [])),
            }
            for d in days
        ]

        # Burndown: walk backwards adding back estimates of tasks finished after each day.
        open_tasks = self._tasks.list_all_open()
        current_remaining = sum(remaining_minutes_for(t) for t in open_tasks)
        burndown = []
        for d in days:
            added_back = sum(
                t.estimated_minutes or 0
                for day, tasks in done_by_day.items()
                if day > d
                for t in tasks
            )
            burndown.append({"date": d.isoformat(), "remaining_minutes": current_remaining + added_back})

        session_minutes = self._session_minutes_by_type(
            today - timedelta(days=_FOCUS_WINDOW_DAYS), today
        )
        focus_distribution = [
            {"type": t.value, "minutes": session_minutes.get(t, 0)}
            for t in TaskType
            if session_minutes.get(t, 0) > 0
        ]

        heatmap_start = today - timedelta(weeks=_HEATMAP_WEEKS)
        learning_by_day = self._learning_minutes_by_day(heatmap_start, today)
        heatmap = [
            {"date": d.isoformat(), "minutes": learning_by_day.get(d, 0)}
            for d in (heatmap_start + timedelta(days=i) for i in range((today - heatmap_start).days + 1))
        ]

        return {
            "velocity": velocity,
            "burndown": burndown,
            "focus_distribution": focus_distribution,
            "learning_heatmap": heatmap,
        }

    # Internals ------------------------------------------------------------

    def _today_summary(self, today: date) -> TodaySummary:
        plan = self._plans.for_date(today)
        if plan is None:
            return TodaySummary(0, 0, 0, 0, 0, 0, 0, 0)
        focus = [e for e in plan.entries if e.kind == PlanEntryKind.FOCUS]
        learning = [e for e in plan.entries if e.kind == PlanEntryKind.LEARNING]
        breaks = [e for e in plan.entries if e.kind == PlanEntryKind.BREAK]
        done = [e for e in focus + learning if e.status == PlanEntryStatus.DONE]
        return TodaySummary(
            planned_focus_minutes=sum(e.duration_minutes for e in focus + learning),
            completed_focus_minutes=sum(e.duration_minutes for e in done),
            deep_work_minutes=sum(e.duration_minutes for e in focus if e.title.startswith("Deep work")),
            learning_minutes=sum(e.duration_minutes for e in learning),
            break_minutes=sum(e.duration_minutes for e in breaks),
            buffer_minutes=plan.buffer_minutes,
            entries_total=len(focus) + len(learning),
            entries_done=len(done),
        )

    def _focus_distribution(self, today: date) -> dict[str, int]:
        minutes = self._session_minutes_by_type(today - timedelta(days=_FOCUS_WINDOW_DAYS), today)
        return {t.value: m for t, m in minutes.items() if m > 0}

    def _session_minutes_by_type(self, start: date, end: date) -> dict[TaskType, int]:
        # Aggregated in Python: the dataset is single-user sized.
        totals: dict[TaskType, int] = {}
        for ws in self._sessions.between(start, end):
            totals[ws.session_type] = totals.get(ws.session_type, 0) + ws.minutes
        return totals

    def _learning_minutes_by_day(self, start: date, end: date) -> dict[date, int]:
        totals: dict[date, int] = {}
        for ws in self._sessions.between(start, end):
            if ws.session_type in (TaskType.RESEARCH, TaskType.READING):
                d = ws.started_at.date()
                totals[d] = totals.get(d, 0) + ws.minutes
        return totals
