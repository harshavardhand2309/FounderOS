"""Tests for the workload & capacity engine (pure, no DB needed)."""

from __future__ import annotations

from datetime import date, timedelta

from app.application.engines.workload import WorkloadEngine, remaining_minutes_for
from app.domain.entities import Task
from app.domain.enums import TaskStatus

TODAY = date(2026, 7, 21)
FALLBACK_MINUTES = 60
BURN_WINDOW_DAYS = 14


def make_task(
    task_id: str = "t",
    status: TaskStatus = TaskStatus.READY,
    estimated_minutes: int | None = None,
    actual_minutes: int = 0,
    project_id: str | None = None,
) -> Task:
    return Task(
        id=task_id,
        title=task_id,
        status=status,
        estimated_minutes=estimated_minutes,
        actual_minutes=actual_minutes,
        project_id=project_id,
    )


def run_report(
    open_tasks: list[Task],
    completed: dict[date, int] | None = None,
    capacity: int = 480,
    planned: int = 0,
):
    return WorkloadEngine().report(
        open_tasks=open_tasks,
        completed_minutes_by_day=completed or {},
        daily_capacity_minutes=capacity,
        planned_today_minutes=planned,
        today=TODAY,
    )


# --- remaining_minutes_for -------------------------------------------------


def test_remaining_is_zero_for_done_task():
    """A DONE task contributes no remaining minutes regardless of estimate."""
    assert remaining_minutes_for(make_task(status=TaskStatus.DONE, estimated_minutes=120)) == 0


def test_remaining_is_zero_for_archived_task():
    """An ARCHIVED task contributes no remaining minutes."""
    assert remaining_minutes_for(make_task(status=TaskStatus.ARCHIVED, estimated_minutes=90)) == 0


def test_remaining_uses_fallback_for_unestimated_open_task():
    """An open task without an estimate counts as the 1h fallback."""
    assert remaining_minutes_for(make_task()) == FALLBACK_MINUTES


def test_remaining_subtracts_actual_minutes():
    """Logged actual minutes reduce the remaining estimate."""
    assert remaining_minutes_for(make_task(estimated_minutes=120, actual_minutes=45)) == 75


def test_remaining_never_negative():
    """Overrunning the estimate clamps remaining at zero."""
    assert remaining_minutes_for(make_task(estimated_minutes=30, actual_minutes=100)) == 0


def test_remaining_subtracts_actual_from_fallback():
    """Actuals also reduce the fallback estimate for unestimated tasks."""
    assert remaining_minutes_for(make_task(actual_minutes=20)) == FALLBACK_MINUTES - 20
    assert remaining_minutes_for(make_task(actual_minutes=90)) == 0


# --- burn rate -------------------------------------------------------------


def test_burn_rate_averages_window_total_over_14_days():
    """Burn rate is total completed minutes in the window divided by 14."""
    completed = {TODAY - timedelta(days=1): 70, TODAY - timedelta(days=3): 70}
    report = run_report([], completed=completed)
    assert report.burn_rate_minutes_per_day == round(140 / BURN_WINDOW_DAYS, 1)


def test_burn_rate_ignores_days_before_window():
    """Minutes completed before the 14-day window do not count."""
    completed = {TODAY - timedelta(days=30): 1400, TODAY - timedelta(days=1): 140}
    report = run_report([], completed=completed)
    assert report.burn_rate_minutes_per_day == 10.0


def test_burn_rate_ignores_future_days():
    """Minutes dated after today (bad data) do not inflate the burn rate."""
    completed = {TODAY + timedelta(days=1): 1400}
    report = run_report([], completed=completed)
    assert report.burn_rate_minutes_per_day == 0.0


def test_burn_rate_zero_with_no_history():
    """No completion history means a zero burn rate."""
    assert run_report([]).burn_rate_minutes_per_day == 0.0


# --- projected completion --------------------------------------------------


def test_projection_none_when_burn_zero_and_work_remains():
    """With work remaining but zero burn, no completion date can be projected."""
    report = run_report([make_task(estimated_minutes=60)])
    assert report.total_remaining_minutes == 60
    assert report.projected_completion is None
    assert report.projects[0].projected_completion is None


def test_projection_today_when_nothing_remains():
    """Zero remaining work projects completion today, even with zero burn."""
    report = run_report([])
    assert report.total_remaining_minutes == 0
    assert report.projected_completion == TODAY


def test_projection_today_when_open_list_only_has_finished_tasks():
    """Tasks that are DONE contribute zero, so projection is still today."""
    report = run_report([make_task(status=TaskStatus.DONE, estimated_minutes=500)])
    assert report.total_remaining_minutes == 0
    assert report.projected_completion == TODAY


def test_projection_divides_remaining_by_burn():
    """140 minutes remaining at 10 min/day burn projects 14 days out."""
    completed = {TODAY - timedelta(days=1): 140}  # burn = 140/14 = 10/day
    report = run_report([make_task(estimated_minutes=140)], completed=completed)
    assert report.projected_completion == TODAY + timedelta(days=14)


# --- overload --------------------------------------------------------------


def test_overloaded_when_planned_exceeds_capacity():
    """Planning more minutes than today's capacity flags an overload."""
    report = run_report([], capacity=480, planned=500)
    assert report.overloaded_today is True
    assert report.overload_ratio == round(500 / 480, 2)


def test_not_overloaded_at_exact_capacity():
    """Planned == capacity is a full day, not an overload."""
    report = run_report([], capacity=480, planned=480)
    assert report.overloaded_today is False
    assert report.overload_ratio == 1.0


def test_zero_capacity_yields_zero_ratio_not_error():
    """Zero capacity never divides by zero; ratio is 0 and no overload."""
    report = run_report([], capacity=0, planned=120)
    assert report.overload_ratio == 0.0
    assert report.overloaded_today is False


# --- per-project grouping --------------------------------------------------


def test_per_project_grouping_and_totals():
    """Tasks group by project (None -> ""), sorted by id, and totals add up."""
    tasks = [
        make_task("t1", estimated_minutes=30, project_id="p1"),
        make_task("t2", estimated_minutes=30, project_id="p1"),
        make_task("t3", estimated_minutes=50, project_id="p2"),
        make_task("t4", project_id=None),  # falls back to 60
    ]
    report = run_report(tasks)
    assert [p.project_id for p in report.projects] == ["", "p1", "p2"]
    by_id = {p.project_id: p for p in report.projects}
    assert by_id["p1"].remaining_minutes == 60
    assert by_id["p1"].open_tasks == 2
    assert by_id["p2"].remaining_minutes == 50
    assert by_id["p2"].open_tasks == 1
    assert by_id[""].remaining_minutes == FALLBACK_MINUTES
    assert report.total_remaining_minutes == 170


def test_weekly_capacity_is_five_working_days():
    """Weekly capacity is daily capacity times five."""
    report = run_report([], capacity=300)
    assert report.weekly_capacity_minutes == 1500
