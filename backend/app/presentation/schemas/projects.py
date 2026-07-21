from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import ProjectPriority, ProjectStatus


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    goals: list[str] = Field(default_factory=list)
    priority: ProjectPriority = ProjectPriority.MEDIUM
    status: ProjectStatus = ProjectStatus.ACTIVE
    color: str = "#5e6ad2"
    deadline: date | None = None


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    goals: list[str] | None = None
    priority: ProjectPriority | None = None
    status: ProjectStatus | None = None
    color: str | None = None
    deadline: date | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    goals: list[str]
    priority: ProjectPriority
    status: ProjectStatus
    color: str
    deadline: date | None
    created_at: datetime
    updated_at: datetime


class ProjectOverviewRead(BaseModel):
    project: ProjectRead
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


class MilestoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    due_date: date | None = None
    sort_order: int = 0


class MilestoneUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    description: str | None = None
    due_date: date | None = None
    completed_at: datetime | None = None
    sort_order: int | None = None


class MilestoneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    name: str
    description: str
    due_date: date | None
    completed_at: datetime | None
    sort_order: int


class EpicCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    color: str = "#8b5cf6"


class EpicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    name: str
    description: str
    color: str
