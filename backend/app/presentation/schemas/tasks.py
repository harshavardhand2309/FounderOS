from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import (
    EnergyLevel,
    EstimateSource,
    Priority,
    RiskLevel,
    TaskStatus,
    TaskType,
)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str = ""
    project_id: str | None = None
    epic_id: str | None = None
    parent_id: str | None = None
    status: TaskStatus = TaskStatus.INBOX
    task_type: TaskType = TaskType.CODING
    priority: Priority = Priority.NONE
    difficulty: int = Field(default=3, ge=1, le=5)
    importance: int = Field(default=3, ge=1, le=5)
    complexity: int = Field(default=3, ge=1, le=5)
    knowledge_value: int = Field(default=2, ge=1, le=5)
    estimated_minutes: int | None = Field(default=None, ge=0)
    risk_level: RiskLevel = RiskLevel.LOW
    confidence: float = Field(default=0.7, ge=0, le=1)
    energy_required: EnergyLevel = EnergyLevel.MEDIUM
    deep_work: bool = False
    labels: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    files: list[str] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list)
    deadline: datetime | None = None
    recurrence: str | None = None


class TaskUpdate(BaseModel):
    """Partial update; only provided fields change."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    project_id: str | None = None
    epic_id: str | None = None
    parent_id: str | None = None
    status: TaskStatus | None = None
    task_type: TaskType | None = None
    priority: Priority | None = None
    difficulty: int | None = Field(default=None, ge=1, le=5)
    importance: int | None = Field(default=None, ge=1, le=5)
    complexity: int | None = Field(default=None, ge=1, le=5)
    knowledge_value: int | None = Field(default=None, ge=1, le=5)
    estimated_minutes: int | None = Field(default=None, ge=0)
    risk_level: RiskLevel | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    energy_required: EnergyLevel | None = None
    deep_work: bool | None = None
    labels: list[str] | None = None
    tags: list[str] | None = None
    files: list[str] | None = None
    links: list[str] | None = None
    deadline: datetime | None = None
    recurrence: str | None = None
    blocked_reason: str | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    project_id: str | None
    epic_id: str | None
    parent_id: str | None
    status: TaskStatus
    task_type: TaskType
    priority: Priority
    priority_score: float
    difficulty: int
    importance: int
    complexity: int
    knowledge_value: int
    learning_score: float
    estimated_minutes: int | None
    estimate_optimistic: int | None
    estimate_pessimistic: int | None
    estimate_confidence: float
    estimate_source: EstimateSource
    actual_minutes: int
    risk_level: RiskLevel
    confidence: float
    energy_required: EnergyLevel
    deep_work: bool
    labels: list[str]
    tags: list[str]
    files: list[str]
    links: list[str]
    deadline: datetime | None
    recurrence: str | None
    blocked_reason: str | None
    sequence: float
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class ChecklistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: str
    read_docs: bool
    read_paper: bool
    summarized: bool
    explained_own_words: bool
    compared_alternatives: bool
    implemented: bool


class ChecklistUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    read_docs: bool | None = None
    read_paper: bool | None = None
    summarized: bool | None = None
    explained_own_words: bool | None = None
    compared_alternatives: bool | None = None
    implemented: bool | None = None


class DependencyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: str
    depends_on_id: str


class DependencyCreate(BaseModel):
    depends_on_id: str


class MoveRequest(BaseModel):
    status: TaskStatus
    before_sequence: float | None = None


class WorkLogRequest(BaseModel):
    minutes: int = Field(ge=1, le=24 * 60)
    deep_work: bool = False
    session_type: TaskType | None = None
    note: str = ""


class TaskDetail(TaskRead):
    checklist: ChecklistRead | None = None
    dependencies: list[DependencyRead] = Field(default_factory=list)
    subtasks: list[TaskRead] = Field(default_factory=list)


class BoardColumn(BaseModel):
    status: TaskStatus
    tasks: list[TaskRead]


class BoardRead(BaseModel):
    columns: list[BoardColumn]
