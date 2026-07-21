"""Tests for the priority scoring engine (pure engine, no db fixtures needed).

Weights come from ``shared/constants.json`` (sum to 1.0): deadline_urgency
0.25, business_impact 0.2, dependency_unblocks 0.15, knowledge_value 0.1,
project_priority 0.15, risk 0.1, effort_efficiency 0.05. The neutral default
task (importance 3, knowledge 2, risk low, no deadline/estimate, priority
NONE) therefore scores 0.235 * 0.955 * 100 = 22.4.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.application.engines.priority import PriorityContext, PriorityEngine
from app.core.config import ScoringConstants, get_shared_constants
from app.domain.entities import Task
from app.domain.enums import Priority, ProjectPriority, RiskLevel, TaskStatus

ENGINE = PriorityEngine(get_shared_constants().scoring)
NOW = datetime(2026, 7, 21, 12, 0, 0)
CTX = PriorityContext(now=NOW)


def make_task(**overrides) -> Task:
    """A neutral task: importance 3, knowledge 2, risk low, no deadline, priority NONE."""
    overrides.setdefault("title", "t")
    return Task(**overrides)


def test_default_task_score_and_components():
    """Rule: the neutral task scores exactly 22.4 with the documented component values."""
    breakdown = ENGINE.score(make_task(), CTX)
    assert breakdown.score == 22.4
    assert breakdown.components == {
        "deadline_urgency": 0.0,
        "business_impact": 0.5,
        "dependency_unblocks": 0.0,
        "knowledge_value": 0.25,
        "project_priority": 0.5,
        "risk": 0.1,
        "effort_efficiency": 0.5,
    }


def test_overdue_deadline_gives_max_urgency_component():
    """Rule: a deadline at or before now yields the maximum urgency component of 1.0."""
    overdue = ENGINE.score(make_task(deadline=NOW - timedelta(days=1)), CTX)
    assert overdue.components["deadline_urgency"] == 1.0
    at_now = ENGINE.score(make_task(deadline=NOW), CTX)
    assert at_now.components["deadline_urgency"] == 1.0
    assert overdue.score == 46.3  # (0.25 * 1.0 + 0.235) * 0.955 * 100


def test_closer_deadlines_score_strictly_higher():
    """Rule: urgency decays exponentially, so scores strictly decrease as the deadline moves out."""
    scores = [
        ENGINE.score(make_task(deadline=NOW + timedelta(days=days)), CTX).score
        for days in (0.5, 1, 2, 5, 10, 13)
    ]
    assert scores == sorted(scores, reverse=True)
    assert len(set(scores)) == len(scores)
    one_day = ENGINE.score(make_task(deadline=NOW + timedelta(days=1)), CTX)
    assert one_day.components["deadline_urgency"] == pytest.approx(0.867)  # exp(-2/14)


def test_importance_scales_business_impact_component():
    """Rule: business_impact maps importance 1..5 linearly onto 0..1 and raises the score with it."""
    components = {
        imp: ENGINE.score(make_task(importance=imp), CTX).components["business_impact"]
        for imp in range(1, 6)
    }
    assert components == {1: 0.0, 2: 0.25, 3: 0.5, 4: 0.75, 5: 1.0}
    scores = [ENGINE.score(make_task(importance=imp), CTX).score for imp in range(1, 6)]
    assert scores == sorted(scores) and len(set(scores)) == 5


def test_knowledge_value_scales_component():
    """Rule: knowledge_value 1..5 maps linearly onto 0..1 and raises the score with it."""
    components = {
        kv: ENGINE.score(make_task(knowledge_value=kv), CTX).components["knowledge_value"]
        for kv in range(1, 6)
    }
    assert components == {1: 0.0, 2: 0.25, 3: 0.5, 4: 0.75, 5: 1.0}
    scores = [ENGINE.score(make_task(knowledge_value=kv), CTX).score for kv in range(1, 6)]
    assert scores == sorted(scores) and len(set(scores)) == 5


def test_unblocks_component_saturates_at_three():
    """Rule: the dependency component grows with unblocked count but saturates at 3 unblocked tasks."""
    def score_for(count: int):
        return ENGINE.score(make_task(), PriorityContext(now=NOW, unblocks_count=count))

    assert score_for(0).components["dependency_unblocks"] == 0.0
    assert score_for(1).components["dependency_unblocks"] == pytest.approx(0.333)
    assert score_for(2).components["dependency_unblocks"] == pytest.approx(0.667)
    assert score_for(3).components["dependency_unblocks"] == 1.0
    assert score_for(7).components["dependency_unblocks"] == 1.0
    assert score_for(0).score < score_for(1).score < score_for(2).score < score_for(3).score
    assert score_for(3).score == score_for(7).score


def test_manual_priority_multiplier_ordering():
    """Rule: manual priority multiplies the score so urgent > high > medium > none > low on identical tasks."""
    scores = {p: ENGINE.score(make_task(priority=p), CTX).score for p in Priority}
    assert scores[Priority.URGENT] > scores[Priority.NONE]
    assert (
        scores[Priority.URGENT]
        > scores[Priority.HIGH]
        > scores[Priority.MEDIUM]
        > scores[Priority.NONE]
        > scores[Priority.LOW]
    )


def test_blocked_context_dampens_score():
    """Rule: ctx.is_blocked multiplies the normalized score by 0.6 so blocked work sinks below actionable work."""
    open_score = ENGINE.score(make_task(), CTX).score
    blocked_score = ENGINE.score(make_task(), PriorityContext(now=NOW, is_blocked=True)).score
    assert blocked_score < open_score
    assert blocked_score == pytest.approx(0.6 * open_score, abs=0.1)


def test_blocked_task_status_dampens_score():
    """Rule: a task whose own status is BLOCKED is dampened the same way as ctx.is_blocked."""
    via_status = ENGINE.score(make_task(status=TaskStatus.BLOCKED), CTX).score
    via_ctx = ENGINE.score(make_task(), PriorityContext(now=NOW, is_blocked=True)).score
    assert via_status == via_ctx == 13.5


def test_score_clamped_at_100_when_everything_maxes():
    """Rule: the score never exceeds 100 even when every component maxes and the urgent multiplier applies."""
    task = make_task(
        importance=5,
        knowledge_value=5,
        risk_level=RiskLevel.CRITICAL,
        estimated_minutes=5,
        priority=Priority.URGENT,
        deadline=NOW - timedelta(days=2),
    )
    ctx = PriorityContext(now=NOW, unblocks_count=10, project_priority=ProjectPriority.CRITICAL)
    breakdown = ENGINE.score(task, ctx)
    assert breakdown.score == 100.0


def test_score_stays_within_bounds_across_sweep():
    """Rule: every combination of inputs yields a score inside [0, 100]."""
    for importance in (1, 5):
        for priority in (Priority.URGENT, Priority.LOW):
            for blocked in (False, True):
                for deadline in (None, NOW - timedelta(days=5), NOW + timedelta(days=30)):
                    task = make_task(
                        importance=importance,
                        priority=priority,
                        deadline=deadline,
                        estimated_minutes=600,
                    )
                    ctx = PriorityContext(
                        now=NOW,
                        is_blocked=blocked,
                        project_priority=ProjectPriority.LOW,
                        unblocks_count=0,
                    )
                    score = ENGINE.score(task, ctx).score
                    assert 0.0 <= score <= 100.0


def test_project_deadline_used_when_task_has_none():
    """Rule: an overdue project deadline drives urgency for a task without its own deadline."""
    ctx = PriorityContext(now=NOW, project_deadline=NOW - timedelta(days=1))
    breakdown = ENGINE.score(make_task(), ctx)
    assert breakdown.components["deadline_urgency"] == 1.0
    assert breakdown.score > ENGINE.score(make_task(), CTX).score


def test_task_deadline_takes_precedence_over_project_deadline():
    """Rule: when both deadlines exist, urgency comes from the task's own deadline, not the project's."""
    ctx = PriorityContext(now=NOW, project_deadline=NOW + timedelta(days=30))
    breakdown = ENGINE.score(make_task(deadline=NOW + timedelta(days=1)), ctx)
    assert breakdown.components["deadline_urgency"] == pytest.approx(0.867)  # exp(-2/14), not exp(-60/14)


def test_effort_efficiency_favors_quick_tasks():
    """Rule: shorter estimates score higher on effort_efficiency; >=480 min scores 0; unknown effort is neutral 0.5."""
    def component(estimated):
        return ENGINE.score(make_task(estimated_minutes=estimated), CTX).components["effort_efficiency"]

    assert component(30) == pytest.approx(0.938)  # 1 - 30/480
    assert component(480) == 0.0
    assert component(600) == 0.0  # capped at the ceiling
    assert component(0) == 0.5  # zero treated as unknown
    assert component(None) == 0.5
    quick = ENGINE.score(make_task(estimated_minutes=30), CTX).score
    slow = ENGINE.score(make_task(estimated_minutes=480), CTX).score
    assert quick > slow


def test_empty_weight_config_scores_zero_without_error():
    """Rule: an empty priority_weights map falls back to total weight 1.0 and yields a 0 score, not a crash."""
    empty_engine = PriorityEngine(ScoringConstants())
    breakdown = empty_engine.score(make_task(), CTX)
    assert breakdown.score == 0.0
