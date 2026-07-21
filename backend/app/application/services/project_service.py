"""Project orchestration: CRUD plus computed health metrics."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from app.application.engines.workload import remaining_minutes_for
from app.application.interfaces import (
    ProjectRepositoryProtocol,
    TaskRepositoryProtocol,
    WorkSessionRepositoryProtocol,
)
from app.domain.entities import Epic, Milestone, Project, utcnow
from app.domain.enums import TaskStatus

_BURN_WINDOW_DAYS = 14
_KNOWLEDGE_VALUE_THRESHOLD = 3  # tasks at/above this count toward knowledge progress


@dataclass(frozen=True)
class ProjectOverview:
    project: Project
    progress_pct: float
    knowledge_progress_pct: float
    total_tasks: int
    done_tasks: int
    open_tasks: int
    blocked_tasks: int
    estimated_remaining_minutes: int
    completion_prediction: date | None
    milestones_total: int
    milestones_done: int


class ProjectService:
    def __init__(
        self,
        projects: ProjectRepositoryProtocol,
        tasks: TaskRepositoryProtocol,
        sessions: WorkSessionRepositoryProtocol,
    ) -> None:
        self._projects = projects
        self._tasks = tasks
        self._sessions = sessions

    # CRUD -----------------------------------------------------------------

    def create(self, data: dict[str, Any]) -> Project:
        return self._projects.add(Project(**data))

    def get(self, project_id: str) -> Project | None:
        return self._projects.get(project_id)

    def list(self, include_archived: bool = False) -> list[Project]:
        return self._projects.list(include_archived=include_archived)

    def update(self, project_id: str, changes: dict[str, Any]) -> Project | None:
        project = self._projects.get(project_id)
        if project is None:
            return None
        for field, value in changes.items():
            setattr(project, field, value)
        return self._projects.save(project)

    def delete(self, project_id: str) -> bool:
        project = self._projects.get(project_id)
        if project is None:
            return False
        # Detach tasks rather than deleting work history.
        for task in self._tasks.list(project_id=project_id, include_archived=True):
            task.project_id = None
            self._tasks.save(task)
        for milestone in self._projects.milestones(project_id):
            self._projects.delete_milestone(milestone)
        for epic in self._projects.epics(project_id):
            self._projects.delete_epic(epic)
        self._projects.delete(project)
        return True

    # Overview -------------------------------------------------------------

    def overview(self, project_id: str) -> ProjectOverview | None:
        project = self._projects.get(project_id)
        if project is None:
            return None
        tasks = self._tasks.list(project_id=project_id, include_archived=True)
        milestones = self._projects.milestones(project_id)
        return self._build_overview(project, tasks, milestones)

    def overviews(self, include_archived: bool = False) -> list[ProjectOverview]:
        result = []
        for project in self._projects.list(include_archived=include_archived):
            tasks = self._tasks.list(project_id=project.id, include_archived=True)
            milestones = self._projects.milestones(project.id)
            result.append(self._build_overview(project, tasks, milestones))
        return result

    def _build_overview(
        self, project: Project, tasks: list, milestones: list[Milestone]
    ) -> ProjectOverview:
        done = [t for t in tasks if t.status == TaskStatus.DONE]
        open_tasks = [t for t in tasks if t.status in TaskStatus.open_statuses()]
        blocked = [t for t in open_tasks if t.status == TaskStatus.BLOCKED]

        # Progress weighted by estimated effort (falls back to task counts).
        total_est = sum(t.estimated_minutes or 0 for t in tasks if t.status != TaskStatus.ARCHIVED)
        done_est = sum(t.estimated_minutes or 0 for t in done)
        if total_est > 0:
            progress = done_est / total_est * 100
        elif tasks:
            progress = len(done) / len(tasks) * 100
        else:
            progress = 0.0

        knowledge_tasks = [t for t in tasks if t.knowledge_value >= _KNOWLEDGE_VALUE_THRESHOLD]
        knowledge_progress = (
            sum(t.learning_score for t in knowledge_tasks) / len(knowledge_tasks)
            if knowledge_tasks
            else 0.0
        )

        remaining = sum(remaining_minutes_for(t) for t in open_tasks)
        return ProjectOverview(
            project=project,
            progress_pct=round(progress, 1),
            knowledge_progress_pct=round(knowledge_progress, 1),
            total_tasks=len([t for t in tasks if t.status != TaskStatus.ARCHIVED]),
            done_tasks=len(done),
            open_tasks=len(open_tasks),
            blocked_tasks=len(blocked),
            estimated_remaining_minutes=remaining,
            completion_prediction=self._predict_completion(remaining),
            milestones_total=len(milestones),
            milestones_done=len([m for m in milestones if m.completed_at is not None]),
        )

    def _predict_completion(self, remaining_minutes: int) -> date | None:
        today = utcnow().date()
        if remaining_minutes <= 0:
            return today
        window_start = today - timedelta(days=_BURN_WINDOW_DAYS)
        by_day = self._sessions.minutes_by_day(window_start, today)
        burn = sum(by_day.values()) / _BURN_WINDOW_DAYS
        if burn <= 0:
            return None
        return today + timedelta(days=int(round(remaining_minutes / burn)))

    # Milestones & epics ---------------------------------------------------

    def add_milestone(self, project_id: str, data: dict[str, Any]) -> Milestone | None:
        if self._projects.get(project_id) is None:
            return None
        return self._projects.add_milestone(Milestone(project_id=project_id, **data))

    def update_milestone(self, milestone_id: str, changes: dict[str, Any]) -> Milestone | None:
        milestone = self._projects.get_milestone(milestone_id)
        if milestone is None:
            return None
        for field, value in changes.items():
            setattr(milestone, field, value)
        return self._projects.save_milestone(milestone)

    def delete_milestone(self, milestone_id: str) -> bool:
        milestone = self._projects.get_milestone(milestone_id)
        if milestone is None:
            return False
        self._projects.delete_milestone(milestone)
        return True

    def milestones(self, project_id: str) -> list[Milestone]:
        return self._projects.milestones(project_id)

    def epics(self, project_id: str) -> list[Epic]:
        return self._projects.epics(project_id)

    def add_epic(self, project_id: str, data: dict[str, Any]) -> Epic | None:
        if self._projects.get(project_id) is None:
            return None
        return self._projects.add_epic(Epic(project_id=project_id, **data))

    def delete_epic(self, epic_id: str) -> bool:
        epic = self._projects.get_epic(epic_id)
        if epic is None:
            return False
        self._projects.delete_epic(epic)
        return True
