"""Time estimation engine.

Produces optimistic / realistic / pessimistic estimates with a confidence
value. The realistic figure starts from a per-type base (config), is scaled
by complexity and difficulty, then corrected by the user's historical
estimate-vs-actual bias for the same task type.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, pstdev

from app.core.config import EstimationConstants
from app.domain.entities import Task
from app.domain.enums import EstimateSource

# Historical correction is dampened so one wild outlier cannot swing estimates.
_HISTORY_BLEND = 0.6  # weight of historical bias vs pure heuristic
_MIN_HISTORY_SAMPLES = 3
_KNOWLEDGE_OVERHEAD = 1.2  # research-heavy tasks accrue reading/verification time
_ROUND_TO_MINUTES = 5


@dataclass(frozen=True)
class EstimateResult:
    optimistic: int
    realistic: int
    pessimistic: int
    confidence: float
    source: EstimateSource


@dataclass(frozen=True)
class HistorySample:
    """A completed task's estimated vs actual minutes."""

    estimated_minutes: int
    actual_minutes: int

    @property
    def ratio(self) -> float | None:
        if self.estimated_minutes <= 0 or self.actual_minutes <= 0:
            return None
        return self.actual_minutes / self.estimated_minutes


class EstimationEngine:
    def __init__(self, constants: EstimationConstants) -> None:
        self._c = constants

    def heuristic_minutes(self, task: Task) -> int:
        base = float(self._c.base_minutes_by_type.get(task.task_type.value, 60))
        complexity_mult = self._c.complexity_multipliers.get(str(task.complexity), 1.0)
        # Difficulty nudges the estimate ±15% around the complexity-scaled base.
        difficulty_mult = 0.85 + 0.075 * (task.difficulty - 1)
        minutes = base * complexity_mult * difficulty_mult
        if task.knowledge_value >= 4:
            minutes *= _KNOWLEDGE_OVERHEAD
        return self._round(minutes)

    def estimate(self, task: Task, history: list[HistorySample] | None = None) -> EstimateResult:
        realistic = float(self.heuristic_minutes(task))
        source = EstimateSource.HEURISTIC
        confidence = self._base_confidence(task)

        ratios = [s.ratio for s in (history or []) if s.ratio is not None]
        if len(ratios) >= _MIN_HISTORY_SAMPLES:
            bias = mean(ratios)
            spread = pstdev(ratios)
            realistic = realistic * (1 - _HISTORY_BLEND) + realistic * bias * _HISTORY_BLEND
            source = EstimateSource.HISTORICAL
            # Consistent history (low spread) earns confidence; erratic history costs it.
            confidence += max(-0.2, min(0.2, 0.2 - spread * 0.25))

        realistic_i = max(_ROUND_TO_MINUTES, self._round(realistic))
        return EstimateResult(
            optimistic=max(_ROUND_TO_MINUTES, self._round(realistic * self._c.optimistic_factor)),
            realistic=realistic_i,
            pessimistic=self._round(realistic * self._c.pessimistic_factor),
            confidence=round(max(0.2, min(0.95, confidence)), 2),
            source=source,
        )

    def _base_confidence(self, task: Task) -> float:
        # Confidence falls as complexity and risk rise.
        confidence = 0.85 - 0.06 * (task.complexity - 1)
        if task.knowledge_value >= 4:
            confidence -= 0.05
        return confidence

    @staticmethod
    def _round(minutes: float) -> int:
        return int(round(minutes / _ROUND_TO_MINUTES) * _ROUND_TO_MINUTES)
