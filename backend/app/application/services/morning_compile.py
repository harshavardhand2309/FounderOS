"""Morning compile: the daily automation pipeline.

Runs every morning (default 06:00 IST, configurable) and on demand via
POST /api/automation/compile:

1. Roll over yesterday's unfinished plan entries.
2. Scan each configured workspace -> derive tasks onto its own board
   (AI via the configured provider — e.g. Opus 4.8 — with heuristic fallback).
3. Recalculate priorities and refresh blocked statuses.
4. Generate today's day plan (the "day calendar"), never overloading it.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

from sqlmodel import Session

from app.application.services.workspace_scanner import (
    WorkspaceResult,
    WorkspaceScanner,
    effective_workspaces,
    ensure_project_for_workspace,
    workspace_board_name,
)
from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.domain.entities import utcnow
from app.domain.enums import ActivityKind
from app.infrastructure.llm.factory import resolve_provider
from app.infrastructure.repositories import (
    ActivityRepository,
    PrefsRepository,
    ProjectRepository,
)

logger = get_logger("morning_compile")

_WORKSPACE_COLORS = ("#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444")


@dataclass(frozen=True)
class CompileReport:
    ran_at: str
    rolled_over_entries: int
    workspaces: list[WorkspaceResult] = field(default_factory=list)
    tasks_created: int = 0
    plan_entries: int = 0
    plan_deferred_note: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


def run_morning_compile(
    session: Session, settings: Settings | None = None
) -> CompileReport:
    from app.presentation.api.deps import get_planner_service, get_task_service

    settings = settings or get_settings()
    task_service = get_task_service(session)
    planner_service = get_planner_service(session)
    projects_repo = ProjectRepository(session)
    activity = ActivityRepository(session)

    # 1. Rollover: unfinished planned work moves forward automatically.
    rolled = planner_service.rollover()

    # 2. Workspace scan -> tasks per board (env-configured + UI-registered).
    provider = resolve_provider(settings)
    scanner = WorkspaceScanner(provider=provider, task_service=task_service)
    workspaces = effective_workspaces(settings, PrefsRepository(session).get())
    results: list[WorkspaceResult] = []
    for index, workspace_path in enumerate(workspaces):
        name = workspace_board_name(workspace_path)
        project = ensure_project_for_workspace(
            name, projects_repo, color=_WORKSPACE_COLORS[index % len(_WORKSPACE_COLORS)]
        )
        result = scanner.scan_workspace(workspace_path, project)
        results.append(result)
        logger.info(
            "Workspace %s: %d tasks created (%s), %d duplicates skipped",
            result.workspace,
            len(result.created_tasks),
            result.source,
            result.skipped_duplicates,
        )

    # 3. Fresh scores before planning.
    task_service.recalculate_priorities()
    task_service.refresh_blocked_statuses()

    # 4. Build today's schedule.
    plan = planner_service.generate(utcnow().date())

    report = CompileReport(
        ran_at=utcnow().isoformat(),
        rolled_over_entries=rolled,
        workspaces=results,
        tasks_created=sum(len(r.created_tasks) for r in results),
        plan_entries=len(plan.entries),
        plan_deferred_note=plan.notes,
    )
    activity.log(ActivityKind.PLAN_GENERATED, payload={"morning_compile": report.to_dict()})
    return report
