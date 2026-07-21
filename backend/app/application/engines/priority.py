"""Priority scoring engine.

Computes a 0-100 score per task from weighted components (weights live in
``shared/constants.json`` so both sides of the app can explain the score).
Recalculated automatically on task changes and on a scheduler interval.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime

from app.core.config import ScoringConstants
from app.domain.entities import Task
from app.domain.enums import Priority, ProjectPriority, TaskStatus

_DEADLINE_HORIZON_DAYS = 14.0  # urgency ramps up inside this window
_EFFORT_CEILING_MINUTES = 480.0  # tasks at/above a full day score 0 on efficiency
_UNBLOCK_SATURATION = 3  # unblocking 3+ tasks maxes the dependency component
_BLOCKED_DAMPENING = 0.6  # blocked work sinks below actionable work


@dataclass(frozen=True)
class PriorityContext:
    """Cross-task facts the score needs but a single row doesn't know."""

    now: datetime
    unblocks_count: int = 0  # open tasks directly unblocked by finishing this one
    project_priority: ProjectPriority | None = None
    project_deadline: datetime | None = None
    is_blocked: bool = False


@dataclass(frozen=True)
class PriorityBreakdown:
    score: float
    components: dict[str, float]


class PriorityEngine:
    def __init__(self, constants: ScoringConstants) -> None:
        self._weights = constants.priority_weights

    def score(self, task: Task, ctx: PriorityContext) -> PriorityBreakdown:
        components = {
            "deadline_urgency": self._deadline_urgency(task, ctx),
            "business_impact": (task.importance - 1) / 4.0,
            "dependency_unblocks": min(1.0, ctx.unblocks_count / _UNBLOCK_SATURATION),
            "knowledge_value": (task.knowledge_value - 1) / 4.0,
            "project_priority": (ctx.project_priority or ProjectPriority.MEDIUM).weight,
            "risk": task.risk_level.weight,
            "effort_efficiency": self._effort_efficiency(task),
        }
        raw = sum(self._weights.get(name, 0.0) * value for name, value in components.items())
        total_weight = sum(self._weights.values()) or 1.0
        normalized = raw / total_weight

        # Manual priority acts as a multiplier so a founder's explicit call
        # always outranks the model's opinion without erasing it.
        normalized *= self._manual_multiplier(task.priority)
        if ctx.is_blocked or task.status == TaskStatus.BLOCKED:
            normalized *= _BLOCKED_DAMPENING

        score = round(max(0.0, min(1.0, normalized)) * 100, 1)
        return PriorityBreakdown(score=score, components={k: round(v, 3) for k, v in components.items()})

    def _deadline_urgency(self, task: Task, ctx: PriorityContext) -> float:
        deadline = task.deadline or ctx.project_deadline
        if deadline is None:
            return 0.0
        days_left = (deadline - ctx.now).total_seconds() / 86400.0
        if days_left <= 0:
            return 1.0  # overdue
        # Exponential ramp: ~1.0 today, ~0.5 at half the horizon, ~0.14 at horizon.
        return math.exp(-2.0 * days_left / _DEADLINE_HORIZON_DAYS)

    @staticmethod
    def _effort_efficiency(task: Task) -> float:
        est = task.estimated_minutes
        if not est or est <= 0:
            return 0.5  # unknown effort: neutral
        return max(0.0, 1.0 - min(est, _EFFORT_CEILING_MINUTES) / _EFFORT_CEILING_MINUTES)

    @staticmethod
    def _manual_multiplier(priority: Priority) -> float:
        return 0.85 + 0.3 * priority.weight
