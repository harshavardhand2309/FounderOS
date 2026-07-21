"""APScheduler wiring for background jobs.

Jobs are registered here; their logic lives in application services so it
stays independently testable. Jobs added in later phases register themselves
via ``register_jobs``.
"""

from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger("scheduler")


def register_jobs(scheduler: BackgroundScheduler, settings: Settings) -> None:
    """Attach recurring jobs. Extended as engines land (see jobs module)."""
    try:
        from app.application.jobs import register_all_jobs
    except ImportError:
        logger.info("No application jobs module yet; scheduler idle")
        return
    register_all_jobs(scheduler, settings)


def build_scheduler(settings: Settings) -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    register_jobs(scheduler, settings)
    return scheduler
