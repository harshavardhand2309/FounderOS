from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.presentation.api.deps import ProjectServiceDep
from app.presentation.schemas.projects import (
    EpicCreate,
    EpicRead,
    MilestoneCreate,
    MilestoneRead,
    MilestoneUpdate,
    ProjectCreate,
    ProjectOverviewRead,
    ProjectRead,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
def list_projects(service: ProjectServiceDep, include_archived: bool = False) -> list[ProjectRead]:
    return [ProjectRead.model_validate(p) for p in service.list(include_archived=include_archived)]


@router.get("/overviews", response_model=list[ProjectOverviewRead])
def list_overviews(service: ProjectServiceDep, include_archived: bool = False) -> list[ProjectOverviewRead]:
    return [_overview_read(o) for o in service.overviews(include_archived=include_archived)]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, service: ProjectServiceDep) -> ProjectRead:
    return ProjectRead.model_validate(service.create(payload.model_dump()))


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, service: ProjectServiceDep) -> ProjectRead:
    project = service.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectRead.model_validate(project)


@router.get("/{project_id}/overview", response_model=ProjectOverviewRead)
def project_overview(project_id: str, service: ProjectServiceDep) -> ProjectOverviewRead:
    overview = service.overview(project_id)
    if overview is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return _overview_read(overview)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(project_id: str, payload: ProjectUpdate, service: ProjectServiceDep) -> ProjectRead:
    project = service.update(project_id, payload.model_dump(exclude_unset=True))
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectRead.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, service: ProjectServiceDep) -> None:
    if not service.delete(project_id):
        raise HTTPException(status_code=404, detail="Project not found")


# Milestones ---------------------------------------------------------------


@router.get("/{project_id}/milestones", response_model=list[MilestoneRead])
def list_milestones(project_id: str, service: ProjectServiceDep) -> list[MilestoneRead]:
    return [MilestoneRead.model_validate(m) for m in service.milestones(project_id)]


@router.post("/{project_id}/milestones", response_model=MilestoneRead, status_code=201)
def add_milestone(project_id: str, payload: MilestoneCreate, service: ProjectServiceDep) -> MilestoneRead:
    milestone = service.add_milestone(project_id, payload.model_dump())
    if milestone is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return MilestoneRead.model_validate(milestone)


@router.patch("/milestones/{milestone_id}", response_model=MilestoneRead)
def update_milestone(milestone_id: str, payload: MilestoneUpdate, service: ProjectServiceDep) -> MilestoneRead:
    milestone = service.update_milestone(milestone_id, payload.model_dump(exclude_unset=True))
    if milestone is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return MilestoneRead.model_validate(milestone)


@router.delete("/milestones/{milestone_id}", status_code=204)
def delete_milestone(milestone_id: str, service: ProjectServiceDep) -> None:
    if not service.delete_milestone(milestone_id):
        raise HTTPException(status_code=404, detail="Milestone not found")


# Epics --------------------------------------------------------------------


@router.get("/{project_id}/epics", response_model=list[EpicRead])
def list_epics(project_id: str, service: ProjectServiceDep) -> list[EpicRead]:
    return [EpicRead.model_validate(e) for e in service.epics(project_id)]


@router.post("/{project_id}/epics", response_model=EpicRead, status_code=201)
def add_epic(project_id: str, payload: EpicCreate, service: ProjectServiceDep) -> EpicRead:
    epic = service.add_epic(project_id, payload.model_dump())
    if epic is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return EpicRead.model_validate(epic)


@router.delete("/epics/{epic_id}", status_code=204)
def delete_epic(epic_id: str, service: ProjectServiceDep) -> None:
    if not service.delete_epic(epic_id):
        raise HTTPException(status_code=404, detail="Epic not found")


def _overview_read(o) -> ProjectOverviewRead:  # type: ignore[no-untyped-def]
    return ProjectOverviewRead(
        project=ProjectRead.model_validate(o.project),
        progress_pct=o.progress_pct,
        knowledge_progress_pct=o.knowledge_progress_pct,
        total_tasks=o.total_tasks,
        done_tasks=o.done_tasks,
        open_tasks=o.open_tasks,
        blocked_tasks=o.blocked_tasks,
        estimated_remaining_minutes=o.estimated_remaining_minutes,
        completion_prediction=o.completion_prediction,
        milestones_total=o.milestones_total,
        milestones_done=o.milestones_done,
    )
