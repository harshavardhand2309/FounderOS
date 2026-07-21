"""Background jobs (APScheduler).

Job logic delegates to application services so it stays testable; this module
only handles wiring and session lifecycles.
"""

from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import Settings, get_shared_constants
from app.core.logging import get_logger

logger = get_logger("jobs")


def recalculate_priorities_job() -> None:
    """Priorities decay/urgency shift over time; keep scores fresh."""
    from app.infrastructure.db import session_scope
    from app.presentation.api.deps import get_task_service

    with session_scope() as session:
        service = get_task_service(session)
        updated = service.recalculate_priorities()
        service.refresh_blocked_statuses()
        if updated:
            logger.info("Priority recalc: %d tasks updated", updated)


def rollover_job() -> None:
    """Move unfinished planned work forward each night."""
    from app.infrastructure.db import session_scope
    from app.presentation.api.deps import get_planner_service

    with session_scope() as session:
        moved = get_planner_service(session).rollover()
        if moved:
            logger.info("Nightly rollover: %d entries moved", moved)


def morning_compile_job() -> None:
    """Daily compile: scan workspaces, derive tasks, build today's plan."""
    from app.application.services.morning_compile import run_morning_compile
    from app.infrastructure.db import session_scope

    with session_scope() as session:
        report = run_morning_compile(session)
        logger.info(
            "Morning compile done: %d tasks created across %d workspaces, %d plan entries",
            report.tasks_created,
            len(report.workspaces),
            report.plan_entries,
        )


def _parse_hhmm(value: str, default: tuple[int, int] = (6, 0)) -> tuple[int, int]:
    try:
        hours, minutes = value.split(":", 1)
        return int(hours), int(minutes)
    except (ValueError, AttributeError):
        return default


def register_all_jobs(scheduler: BackgroundScheduler, settings: Settings) -> None:
    get_shared_constants()  # fail fast if constants are unreadable
    scheduler.add_job(
        recalculate_priorities_job,
        IntervalTrigger(minutes=settings.priority_recalc_interval_minutes),
        id="recalc_priorities",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        rollover_job,
        CronTrigger(hour=settings.rollover_hour, minute=0),
        id="nightly_rollover",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    if settings.morning_compile_enabled:
        hour, minute = _parse_hhmm(settings.morning_compile_time)
        scheduler.add_job(
            morning_compile_job,
            CronTrigger(hour=hour, minute=minute, timezone=settings.timezone),
            id="morning_compile",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        logger.info(
            "Morning compile scheduled at %02d:%02d %s (%d workspaces)",
            hour,
            minute,
            settings.timezone,
            len(settings.workspaces),
        )
    logger.info(
        "Jobs registered: priority recalc every %dm, rollover at %02d:00",
        settings.priority_recalc_interval_minutes,
        settings.rollover_hour,
    )
