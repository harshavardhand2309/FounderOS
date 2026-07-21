"""Dependency injection wiring.

FastAPI ``Depends`` builds the object graph per request: session → repositories
→ engines → services. Engines are stateless and cheap to construct.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from app.application.engines.dependencies import DependencyEngine
from app.application.engines.estimation import EstimationEngine
from app.application.engines.knowledge import KnowledgeScorer
from app.application.engines.planner import PlannerEngine
from app.application.engines.priority import PriorityEngine
from app.application.engines.workload import WorkloadEngine
from app.application.services.dashboard_service import DashboardService
from app.application.services.note_service import NoteService
from app.application.services.planner_service import PlannerService
from app.application.services.project_service import ProjectService
from app.application.services.reading_service import ReadingService
from app.application.services.search_service import SearchService
from app.application.services.task_service import TaskService
from app.core.config import get_shared_constants
from app.infrastructure.db import get_session
from app.infrastructure.repositories import (
    ActivityRepository,
    ChecklistRepository,
    DependencyRepository,
    NoteRepository,
    PlanRepository,
    PrefsRepository,
    ProjectRepository,
    ReadingRepository,
    TaskRepository,
    WorkSessionRepository,
)

SessionDep = Annotated[Session, Depends(get_session)]


def get_task_service(session: SessionDep) -> TaskService:
    constants = get_shared_constants()
    return TaskService(
        tasks=TaskRepository(session),
        deps=DependencyRepository(session),
        checklists=ChecklistRepository(session),
        sessions=WorkSessionRepository(session),
        projects=ProjectRepository(session),
        activity=ActivityRepository(session),
        estimator=EstimationEngine(constants.estimation),
        prioritizer=PriorityEngine(constants.scoring),
        dependency_engine=DependencyEngine(),
        knowledge=KnowledgeScorer(constants.scoring),
    )


def get_project_service(session: SessionDep) -> ProjectService:
    return ProjectService(
        projects=ProjectRepository(session),
        tasks=TaskRepository(session),
        sessions=WorkSessionRepository(session),
    )


def get_planner_service(session: SessionDep) -> PlannerService:
    constants = get_shared_constants()
    return PlannerService(
        plans=PlanRepository(session),
        tasks=TaskRepository(session),
        deps=DependencyRepository(session),
        prefs=PrefsRepository(session),
        reading=ReadingRepository(session),
        activity=ActivityRepository(session),
        engine=PlannerEngine(constants.planner),
        dependency_engine=DependencyEngine(),
    )


def get_dashboard_service(session: SessionDep) -> DashboardService:
    return DashboardService(
        tasks=TaskRepository(session),
        sessions=WorkSessionRepository(session),
        plans=PlanRepository(session),
        prefs=PrefsRepository(session),
        reading=ReadingRepository(session),
        workload=WorkloadEngine(),
    )


def get_note_service(session: SessionDep) -> NoteService:
    return NoteService(notes=NoteRepository(session), activity=ActivityRepository(session))


def get_reading_service(session: SessionDep) -> ReadingService:
    return ReadingService(reading=ReadingRepository(session), activity=ActivityRepository(session))


def get_search_service(session: SessionDep) -> SearchService:
    return SearchService(
        tasks=TaskRepository(session),
        projects=ProjectRepository(session),
        notes=NoteRepository(session),
        reading=ReadingRepository(session),
    )


def get_prefs_repo(session: SessionDep) -> PrefsRepository:
    return PrefsRepository(session)


TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]
ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]
PlannerServiceDep = Annotated[PlannerService, Depends(get_planner_service)]
DashboardServiceDep = Annotated[DashboardService, Depends(get_dashboard_service)]
NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]
ReadingServiceDep = Annotated[ReadingService, Depends(get_reading_service)]
SearchServiceDep = Annotated[SearchService, Depends(get_search_service)]
PrefsRepoDep = Annotated[PrefsRepository, Depends(get_prefs_repo)]
