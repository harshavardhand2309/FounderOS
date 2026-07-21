"""Workload & capacity engine.

Turns estimates, actuals and recent completion history into capacity math:
remaining hours, burn rate, projected completion, and overload warnings.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from app.domain.entities import Task
from app.domain.enums import TaskStatus

_BURN_WINDOW_DAYS = 14
_FALLBACK_ESTIMATE_MINUTES = 60  # unestimated open tasks count as 1h in totals


@dataclass(frozen=True)
class ProjectWorkload:
    project_id: str
    remaining_minutes: int
    open_tasks: int
    projected_completion: date | None  # None when burn rate is zero


@dataclass(frozen=True)
class WorkloadReport:
    daily_capacity_minutes: int
    weekly_capacity_minutes: int
    total_remaining_minutes: int
    burn_rate_minutes_per_day: float
    projected_completion: date | None
    overloaded_today: bool
    overload_ratio: float  # planned / capacity for today
    projects: list[ProjectWorkload]


def remaining_minutes_for(task: Task) -> int:
    if task.status in (TaskStatus.DONE, TaskStatus.ARCHIVED):
        return 0
    estimate = task.estimated_minutes or _FALLBACK_ESTIMATE_MINUTES
    return max(0, estimate - task.actual_minutes)


class WorkloadEngine:
    def report(
        self,
        open_tasks: list[Task],
        completed_minutes_by_day: dict[date, int],
        daily_capacity_minutes: int,
        planned_today_minutes: int,
        today: date,
    ) -> WorkloadReport:
        burn = self._burn_rate(completed_minutes_by_day, today)

        per_project: dict[str, list[Task]] = {}
        for task in open_tasks:
            per_project.setdefault(task.project_id or "", []).append(task)

        projects: list[ProjectWorkload] = []
        for project_id, tasks in sorted(per_project.items()):
            remaining = sum(remaining_minutes_for(t) for t in tasks)
            projects.append(
                ProjectWorkload(
                    project_id=project_id,
                    remaining_minutes=remaining,
                    open_tasks=len(tasks),
                    projected_completion=self._project_date(remaining, burn, today),
                )
            )

        total_remaining = sum(p.remaining_minutes for p in projects)
        ratio = planned_today_minutes / daily_capacity_minutes if daily_capacity_minutes else 0.0
        return WorkloadReport(
            daily_capacity_minutes=daily_capacity_minutes,
            weekly_capacity_minutes=daily_capacity_minutes * 5,
            total_remaining_minutes=total_remaining,
            burn_rate_minutes_per_day=round(burn, 1),
            projected_completion=self._project_date(total_remaining, burn, today),
            overloaded_today=ratio > 1.0,
            overload_ratio=round(ratio, 2),
            projects=projects,
        )

    @staticmethod
    def _burn_rate(completed_minutes_by_day: dict[date, int], today: date) -> float:
        # Exclusive lower bound: exactly _BURN_WINDOW_DAYS calendar days.
        window_start = today - timedelta(days=_BURN_WINDOW_DAYS)
        total = sum(
            minutes for day, minutes in completed_minutes_by_day.items() if window_start < day <= today
        )
        return total / _BURN_WINDOW_DAYS

    @staticmethod
    def _project_date(remaining_minutes: int, burn_rate: float, today: date) -> date | None:
        if remaining_minutes <= 0:
            return today
        if burn_rate <= 0:
            return None
        return today + timedelta(days=int(round(remaining_minutes / burn_rate)))
