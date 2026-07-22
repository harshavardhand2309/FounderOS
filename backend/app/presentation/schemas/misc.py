from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import (
    NoteKind,
    PlanEntryKind,
    PlanEntryStatus,
    ReadingKind,
    ReadingStatus,
    TaskType,
)

# Planner ------------------------------------------------------------------


class PlanGenerateRequest(BaseModel):
    plan_date: date | None = None  # defaults to today
    available_minutes: int | None = Field(default=None, ge=0, le=24 * 60)


class PlanEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str | None
    kind: PlanEntryKind
    session_type: TaskType | None
    title: str
    start_minute: int
    duration_minutes: int
    status: PlanEntryStatus
    locked: bool


class PlanEntryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: PlanEntryStatus | None = None
    locked: bool | None = None


class DayPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    plan_date: date
    available_minutes: int
    buffer_minutes: int
    generated_at: datetime
    notes: str
    entries: list[PlanEntryRead]


# Notes --------------------------------------------------------------------


class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    kind: NoteKind = NoteKind.RESEARCH
    content_md: str = ""
    content_json: str | None = None
    task_id: str | None = None
    project_id: str | None = None
    tags: list[str] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    kind: NoteKind | None = None
    content_md: str | None = None
    content_json: str | None = None
    task_id: str | None = None
    project_id: str | None = None
    tags: list[str] | None = None


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    kind: NoteKind
    content_md: str
    content_json: str | None
    task_id: str | None
    project_id: str | None
    tags: list[str]
    source_path: str | None
    created_at: datetime
    updated_at: datetime


# Reading ------------------------------------------------------------------


class ReadingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    author: str = ""
    url: str = ""
    kind: ReadingKind = ReadingKind.ARTICLE
    status: ReadingStatus = ReadingStatus.QUEUED
    project_id: str | None = None
    task_id: str | None = None


class ReadingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    author: str | None = None
    url: str | None = None
    kind: ReadingKind | None = None
    status: ReadingStatus | None = None
    progress_pct: int | None = Field(default=None, ge=0, le=100)
    project_id: str | None = None
    task_id: str | None = None
    note_id: str | None = None
    knowledge_score: int | None = Field(default=None, ge=0, le=100)
    understanding_score: int | None = Field(default=None, ge=0, le=100)
    implementation_score: int | None = Field(default=None, ge=0, le=100)
    next_review_at: date | None = None
    review_interval_days: int | None = Field(default=None, ge=1)


class ReadingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    author: str
    url: str
    kind: ReadingKind
    status: ReadingStatus
    progress_pct: int
    project_id: str | None
    task_id: str | None
    note_id: str | None
    knowledge_score: int
    understanding_score: int
    implementation_score: int
    next_review_at: date | None
    review_interval_days: int
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


# Search -------------------------------------------------------------------


class SearchHitRead(BaseModel):
    kind: str
    id: str
    title: str
    snippet: str
    score: float
    project_id: str | None
    status: str | None
    match: str = "keyword"  # keyword | semantic | hybrid


class SemanticStatusRead(BaseModel):
    available: bool
    provider: str | None
    model: str | None
    indexed: int
    detail: str


class ReindexResultRead(BaseModel):
    indexed: int
    skipped: int
    deleted: int
    total: int


# Sprint -------------------------------------------------------------------


class SprintProposeRequest(BaseModel):
    week_start: date | None = None  # defaults to next Monday


class SprintTaskRead(BaseModel):
    id: str
    title: str
    task_type: TaskType
    status: str
    project_id: str | None
    estimated_minutes: int
    priority_score: float
    deep_work: bool


class SprintProposalRead(BaseModel):
    week_start: date
    week_end: date
    capacity_minutes: int
    planned_minutes: int
    theme: str
    summary: str
    source: str  # "ai" | "heuristic"
    tasks: list[SprintTaskRead]
    stretch: list[SprintTaskRead]


class SprintAcceptRequest(BaseModel):
    week_start: date
    task_ids: list[str] = Field(min_length=1)


class SprintAcceptResult(BaseModel):
    week_start: date
    updated: int
    note_id: str


# Prefs --------------------------------------------------------------------


class PrefsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    available_hours: float
    day_start: str
    deep_work_block_minutes: int
    week_start_monday: bool
    theme: str
    llm_enabled: bool


class PrefsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    available_hours: float | None = Field(default=None, ge=0, le=24)
    day_start: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    deep_work_block_minutes: int | None = Field(default=None, ge=25, le=240)
    week_start_monday: bool | None = None
    theme: str | None = None
    llm_enabled: bool | None = None


# Dashboard ----------------------------------------------------------------


class TodaySummaryRead(BaseModel):
    planned_focus_minutes: int
    completed_focus_minutes: int
    deep_work_minutes: int
    learning_minutes: int
    break_minutes: int
    buffer_minutes: int
    entries_total: int
    entries_done: int


class DashboardOverviewRead(BaseModel):
    today: TodaySummaryRead
    total_remaining_minutes: int
    burn_rate_minutes_per_day: float
    projected_completion: date | None
    overloaded_today: bool
    overload_ratio: float
    open_tasks: int
    blocked_tasks: int
    overdue_tasks: int
    done_this_week: int
    velocity_tasks_per_day: float
    avg_knowledge_score: float
    reading_in_progress: int
    reviews_due: int
    focus_distribution: dict[str, int]
