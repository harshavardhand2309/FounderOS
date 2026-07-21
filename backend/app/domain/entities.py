"""Persistent domain entities (SQLModel tables).

With SQLModel the ORM models double as domain entities; computed values
(progress, scores, predictions) live in the application layer, never here.
See docs/adr/0001-sqlmodel-entities.md for the trade-off discussion.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.domain.enums import (
    ActivityKind,
    EnergyLevel,
    EstimateSource,
    NoteKind,
    PlanEntryKind,
    PlanEntryStatus,
    Priority,
    ProjectPriority,
    ProjectStatus,
    ReadingKind,
    ReadingStatus,
    RiskLevel,
    TaskStatus,
    TaskType,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id() -> str:
    return str(uuid4())


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: str = Field(default_factory=new_id, primary_key=True)
    name: str = Field(index=True)
    description: str = ""
    goals: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    priority: ProjectPriority = Field(default=ProjectPriority.MEDIUM, index=True)
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE, index=True)
    color: str = "#5e6ad2"
    deadline: date | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    milestones: list["Milestone"] = Relationship(back_populates="project")
    tasks: list["Task"] = Relationship(back_populates="project")


class Milestone(SQLModel, table=True):
    __tablename__ = "milestones"

    id: str = Field(default_factory=new_id, primary_key=True)
    project_id: str = Field(foreign_key="projects.id", index=True)
    name: str
    description: str = ""
    due_date: date | None = None
    completed_at: datetime | None = None
    sort_order: int = 0

    project: Project = Relationship(back_populates="milestones")


class Epic(SQLModel, table=True):
    __tablename__ = "epics"

    id: str = Field(default_factory=new_id, primary_key=True)
    project_id: str = Field(foreign_key="projects.id", index=True)
    name: str
    description: str = ""
    color: str = "#8b5cf6"
    created_at: datetime = Field(default_factory=utcnow)


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: str = Field(default_factory=new_id, primary_key=True)
    title: str = Field(index=True)
    description: str = ""

    project_id: str | None = Field(default=None, foreign_key="projects.id", index=True)
    epic_id: str | None = Field(default=None, foreign_key="epics.id", index=True)
    parent_id: str | None = Field(default=None, foreign_key="tasks.id", index=True)

    status: TaskStatus = Field(default=TaskStatus.INBOX, index=True)
    task_type: TaskType = Field(default=TaskType.CODING, index=True)
    priority: Priority = Field(default=Priority.NONE, index=True)
    priority_score: float = Field(default=0.0, index=True)  # 0-100, engine-computed

    difficulty: int = Field(default=3, ge=1, le=5)
    importance: int = Field(default=3, ge=1, le=5)  # business impact
    complexity: int = Field(default=3, ge=1, le=5)
    knowledge_value: int = Field(default=2, ge=1, le=5)
    learning_score: float = Field(default=0.0, ge=0, le=100)

    estimated_minutes: int | None = Field(default=None, ge=0)  # realistic
    estimate_optimistic: int | None = Field(default=None, ge=0)
    estimate_pessimistic: int | None = Field(default=None, ge=0)
    estimate_confidence: float = Field(default=0.5, ge=0, le=1)
    estimate_source: EstimateSource = Field(default=EstimateSource.HEURISTIC)
    actual_minutes: int = Field(default=0, ge=0)

    risk_level: RiskLevel = Field(default=RiskLevel.LOW)
    confidence: float = Field(default=0.7, ge=0, le=1)  # delivery confidence
    energy_required: EnergyLevel = Field(default=EnergyLevel.MEDIUM)
    deep_work: bool = Field(default=False)

    labels: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    files: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    links: list[str] = Field(default_factory=list, sa_column=Column(JSON))

    deadline: datetime | None = Field(default=None, index=True)
    recurrence: str | None = None  # e.g. "daily", "weekly:mon", "monthly:1"
    blocked_reason: str | None = None
    sequence: float = Field(default=0.0)  # ordering within a kanban column

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    completed_at: datetime | None = None

    project: Project | None = Relationship(back_populates="tasks")
    checklist: "KnowledgeChecklist" = Relationship(
        back_populates="task",
        sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"},
    )


class TaskDependency(SQLModel, table=True):
    """``task_id`` cannot start until ``depends_on_id`` is done."""

    __tablename__ = "task_dependencies"
    __table_args__ = (UniqueConstraint("task_id", "depends_on_id", name="uq_dependency_pair"),)

    id: str = Field(default_factory=new_id, primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", index=True)
    depends_on_id: str = Field(foreign_key="tasks.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)


class KnowledgeChecklist(SQLModel, table=True):
    """Learning-engine checklist attached to a task.

    Completion alone never equals knowledge: the knowledge score is derived
    from these flags via weights in ``shared/constants.json``.
    """

    __tablename__ = "knowledge_checklists"

    id: str = Field(default_factory=new_id, primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", unique=True, index=True)
    read_docs: bool = False
    read_paper: bool = False
    summarized: bool = False
    explained_own_words: bool = False
    compared_alternatives: bool = False
    implemented: bool = False
    updated_at: datetime = Field(default_factory=utcnow)

    task: Task = Relationship(back_populates="checklist")


class Note(SQLModel, table=True):
    __tablename__ = "notes"

    id: str = Field(default_factory=new_id, primary_key=True)
    title: str = Field(index=True)
    kind: NoteKind = Field(default=NoteKind.RESEARCH, index=True)
    content_md: str = ""  # canonical markdown content
    content_json: str | None = None  # TipTap document JSON, when edited richly
    task_id: str | None = Field(default=None, foreign_key="tasks.id", index=True)
    project_id: str | None = Field(default=None, foreign_key="projects.id", index=True)
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    source_path: str | None = Field(default=None, index=True)  # set for file-watched notes
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ReadingItem(SQLModel, table=True):
    __tablename__ = "reading_items"

    id: str = Field(default_factory=new_id, primary_key=True)
    title: str = Field(index=True)
    author: str = ""
    url: str = ""
    kind: ReadingKind = Field(default=ReadingKind.ARTICLE, index=True)
    status: ReadingStatus = Field(default=ReadingStatus.QUEUED, index=True)
    progress_pct: int = Field(default=0, ge=0, le=100)

    project_id: str | None = Field(default=None, foreign_key="projects.id", index=True)
    task_id: str | None = Field(default=None, foreign_key="tasks.id", index=True)
    note_id: str | None = Field(default=None, foreign_key="notes.id")

    knowledge_score: int = Field(default=0, ge=0, le=100)
    understanding_score: int = Field(default=0, ge=0, le=100)
    implementation_score: int = Field(default=0, ge=0, le=100)

    next_review_at: date | None = Field(default=None, index=True)
    review_interval_days: int = Field(default=7, ge=1)

    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class WorkSession(SQLModel, table=True):
    """A logged block of real work on a task; feeds actuals and history."""

    __tablename__ = "work_sessions"

    id: str = Field(default_factory=new_id, primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", index=True)
    started_at: datetime = Field(default_factory=utcnow)
    ended_at: datetime | None = None
    minutes: int = Field(default=0, ge=0)
    deep_work: bool = False
    session_type: TaskType = Field(default=TaskType.CODING)
    note: str = ""


class DayPlan(SQLModel, table=True):
    __tablename__ = "day_plans"

    id: str = Field(default_factory=new_id, primary_key=True)
    plan_date: date = Field(unique=True, index=True)
    available_minutes: int = Field(ge=0)
    buffer_minutes: int = Field(default=0, ge=0)
    generated_at: datetime = Field(default_factory=utcnow)
    notes: str = ""

    entries: list["PlanEntry"] = Relationship(
        back_populates="plan",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "order_by": "PlanEntry.start_minute"},
    )


class PlanEntry(SQLModel, table=True):
    __tablename__ = "plan_entries"

    id: str = Field(default_factory=new_id, primary_key=True)
    plan_id: str = Field(foreign_key="day_plans.id", index=True)
    task_id: str | None = Field(default=None, foreign_key="tasks.id", index=True)
    kind: PlanEntryKind = Field(default=PlanEntryKind.FOCUS)
    session_type: TaskType | None = None
    title: str  # denormalized display title ("Deep work: X", "Break", ...)
    start_minute: int = Field(ge=0)  # minutes from midnight, local
    duration_minutes: int = Field(ge=0)
    status: PlanEntryStatus = Field(default=PlanEntryStatus.PLANNED)
    locked: bool = False  # user-pinned entries survive replans

    plan: DayPlan = Relationship(back_populates="entries")


class UserPrefs(SQLModel, table=True):
    """Single-row preferences (single-user, local-first)."""

    __tablename__ = "user_prefs"

    id: int = Field(default=1, primary_key=True)
    available_hours: float = Field(default=8.0, ge=0, le=24)
    day_start: str = "09:00"
    deep_work_block_minutes: int = Field(default=90, ge=25, le=240)
    week_start_monday: bool = True
    theme: str = "dark"
    llm_enabled: bool = True
    extra: dict = Field(default_factory=dict, sa_column=Column(JSON))


class ActivityLog(SQLModel, table=True):
    """Append-only event log powering velocity, burndown and history charts."""

    __tablename__ = "activity_log"

    id: str = Field(default_factory=new_id, primary_key=True)
    ts: datetime = Field(default_factory=utcnow, index=True)
    kind: ActivityKind = Field(index=True)
    task_id: str | None = Field(default=None, index=True)
    project_id: str | None = Field(default=None, index=True)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))
