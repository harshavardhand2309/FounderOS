"""Domain enumerations.

Values mirror ``shared/constants.json`` so the frontend and backend agree on
the vocabulary. ``str``-based enums serialize cleanly through JSON and SQLite.
"""

from __future__ import annotations

from enum import Enum


class TaskStatus(str, Enum):
    INBOX = "inbox"
    BACKLOG = "backlog"
    READY = "ready"
    RESEARCH = "research"
    READING = "reading"
    CODING = "coding"
    WRITING = "writing"
    REVIEW = "review"
    BLOCKED = "blocked"
    DONE = "done"
    ARCHIVED = "archived"

    @classmethod
    def working_statuses(cls) -> tuple["TaskStatus", ...]:
        return (cls.RESEARCH, cls.READING, cls.CODING, cls.WRITING, cls.REVIEW)

    @classmethod
    def open_statuses(cls) -> tuple["TaskStatus", ...]:
        return (
            cls.INBOX,
            cls.BACKLOG,
            cls.READY,
            cls.RESEARCH,
            cls.READING,
            cls.CODING,
            cls.WRITING,
            cls.REVIEW,
            cls.BLOCKED,
        )


class TaskType(str, Enum):
    RESEARCH = "research"
    READING = "reading"
    CODING = "coding"
    WRITING = "writing"
    REVIEW = "review"
    PLANNING = "planning"
    ADMIN = "admin"


class Priority(str, Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"

    @property
    def weight(self) -> float:
        return {
            Priority.URGENT: 1.0,
            Priority.HIGH: 0.75,
            Priority.MEDIUM: 0.5,
            Priority.LOW: 0.25,
            Priority.NONE: 0.35,  # unset ranks slightly above LOW so triage still surfaces it
        }[self]


class EnergyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    @property
    def weight(self) -> float:
        return {
            RiskLevel.LOW: 0.1,
            RiskLevel.MEDIUM: 0.4,
            RiskLevel.HIGH: 0.7,
            RiskLevel.CRITICAL: 1.0,
        }[self]


class ProjectStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ProjectPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

    @property
    def weight(self) -> float:
        return {
            ProjectPriority.CRITICAL: 1.0,
            ProjectPriority.HIGH: 0.75,
            ProjectPriority.MEDIUM: 0.5,
            ProjectPriority.LOW: 0.25,
        }[self]


class NoteKind(str, Enum):
    RESEARCH = "research"
    SUMMARY = "summary"
    PAPER_REVIEW = "paper_review"
    BOOK_NOTES = "book_notes"
    DECISION_LOG = "decision_log"
    ADR = "adr"
    MEETING = "meeting"
    TECHNICAL = "technical"


class ReadingKind(str, Enum):
    PAPER = "paper"
    BOOK = "book"
    ARTICLE = "article"
    DOCS = "docs"
    COURSE = "course"
    VIDEO = "video"


class ReadingStatus(str, Enum):
    QUEUED = "queued"
    READING = "reading"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class PlanEntryKind(str, Enum):
    FOCUS = "focus"
    LEARNING = "learning"
    BREAK = "break"
    BUFFER = "buffer"


class PlanEntryStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    SKIPPED = "skipped"
    MOVED = "moved"


class EstimateSource(str, Enum):
    MANUAL = "manual"
    HEURISTIC = "heuristic"
    HISTORICAL = "historical"
    AI = "ai"


class ActivityKind(str, Enum):
    TASK_CREATED = "task_created"
    TASK_COMPLETED = "task_completed"
    STATUS_CHANGED = "status_changed"
    PLAN_GENERATED = "plan_generated"
    PLAN_ROLLED_OVER = "plan_rolled_over"
    NOTE_CREATED = "note_created"
    READING_COMPLETED = "reading_completed"
    SESSION_LOGGED = "session_logged"
