"""Tests for the estimation engine (pure engine, no db fixtures needed).

Expected numbers are derived from ``shared/constants.json``:
base_minutes_by_type (coding=150, admin=20, ...), complexity multipliers
{1: 0.5, 2: 0.75, 3: 1.0, 4: 1.5, 5: 2.25}, optimistic_factor 0.7,
pessimistic_factor 1.8; plus the engine-internal difficulty nudge
(0.85 + 0.075 * (difficulty - 1)), knowledge overhead (x1.2 at
knowledge_value >= 4) and history blend (0.6 toward the historical bias).
"""

from __future__ import annotations

import itertools

import pytest

from app.application.engines.estimation import EstimationEngine, HistorySample
from app.core.config import EstimationConstants, get_shared_constants
from app.domain.entities import Task
from app.domain.enums import EstimateSource, TaskType

ENGINE = EstimationEngine(get_shared_constants().estimation)


def make_task(**overrides) -> Task:
    """A neutral task: coding, complexity 3, difficulty 3, knowledge 2."""
    overrides.setdefault("title", "t")
    return Task(**overrides)


def test_base_minutes_scale_by_task_type():
    """Rule: with neutral complexity/difficulty the realistic heuristic equals the per-type base from config."""
    expected = {
        TaskType.RESEARCH: 120,
        TaskType.READING: 90,
        TaskType.CODING: 150,
        TaskType.WRITING: 90,
        TaskType.REVIEW: 45,
        TaskType.PLANNING: 30,
        TaskType.ADMIN: 20,
    }
    for task_type, minutes in expected.items():
        assert ENGINE.heuristic_minutes(make_task(task_type=task_type)) == minutes


def test_missing_config_entries_fall_back_to_defaults():
    """Rule: a task type absent from base_minutes_by_type falls back to 60 min with a 1.0 complexity multiplier."""
    bare_engine = EstimationEngine(EstimationConstants())
    assert bare_engine.heuristic_minutes(make_task()) == 60


def test_complexity_multipliers_scale_estimate():
    """Rule: complexity applies the configured multiplier (0.5/0.75/1.0/1.5/2.25) to the type base."""
    by_complexity = {c: ENGINE.heuristic_minutes(make_task(complexity=c)) for c in range(1, 6)}
    assert by_complexity == {1: 75, 2: 110, 3: 150, 4: 225, 5: 340}
    values = [by_complexity[c] for c in range(1, 6)]
    assert values == sorted(values) and len(set(values)) == 5


def test_difficulty_nudges_estimate_15_percent_around_base():
    """Rule: difficulty nudges the estimate +/-15% (0.85x at 1, 1.0x at 3, 1.15x at 5)."""
    by_difficulty = {d: ENGINE.heuristic_minutes(make_task(difficulty=d)) for d in range(1, 6)}
    assert by_difficulty == {1: 130, 2: 140, 3: 150, 4: 160, 5: 170}


def test_knowledge_overhead_applies_from_value_4():
    """Rule: knowledge_value >= 4 adds a 1.2x research/verification overhead; below 4 it does not."""
    assert ENGINE.heuristic_minutes(make_task(knowledge_value=2)) == 150
    assert ENGINE.heuristic_minutes(make_task(knowledge_value=3)) == 150
    assert ENGINE.heuristic_minutes(make_task(knowledge_value=4)) == 180
    assert ENGINE.heuristic_minutes(make_task(knowledge_value=5)) == 180


def test_all_factors_combine_multiplicatively():
    """Rule: base, complexity, difficulty and knowledge overhead multiply together (120*1.5*1.15*1.2 -> 250)."""
    task = make_task(task_type=TaskType.RESEARCH, complexity=4, difficulty=5, knowledge_value=5)
    assert ENGINE.heuristic_minutes(task) == 250


def test_estimate_orders_optimistic_realistic_pessimistic():
    """Rule: optimistic (x0.7) < realistic < pessimistic (x1.8) for a normal task."""
    result = ENGINE.estimate(make_task())
    assert result.realistic == 150
    assert result.optimistic == 105
    assert result.pessimistic == 270
    assert result.optimistic < result.realistic < result.pessimistic
    assert result.source == EstimateSource.HEURISTIC


def test_estimates_round_to_five_across_input_sweep():
    """Rule: all three figures are rounded to 5-minute granularity and stay weakly ordered for every input combo."""
    for task_type, complexity, difficulty, knowledge in itertools.product(
        TaskType, range(1, 6), range(1, 6), (2, 5)
    ):
        task = make_task(
            task_type=task_type, complexity=complexity, difficulty=difficulty, knowledge_value=knowledge
        )
        result = ENGINE.estimate(task)
        assert result.optimistic % 5 == 0
        assert result.realistic % 5 == 0
        assert result.pessimistic % 5 == 0
        assert result.optimistic <= result.realistic <= result.pessimistic
        assert result.realistic >= 5


def test_history_with_three_samples_shifts_realistic_toward_actuals():
    """Rule: >=3 valid samples blend the actual/estimated bias in at 0.6 weight and flip source to HISTORICAL."""
    history = [HistorySample(estimated_minutes=60, actual_minutes=120)] * 3  # bias 2.0
    result = ENGINE.estimate(make_task(), history)
    # 150 * (0.4 + 2.0 * 0.6) = 240
    assert result.realistic == 240
    assert result.source == EstimateSource.HISTORICAL
    assert result.optimistic == 170
    assert result.pessimistic == 430


def test_history_bias_below_one_shifts_realistic_down():
    """Rule: a user who overestimates (actual < estimated) gets a lower corrected realistic figure."""
    history = [HistorySample(estimated_minutes=120, actual_minutes=60)] * 3  # bias 0.5
    result = ENGINE.estimate(make_task(), history)
    # 150 * (0.4 + 0.5 * 0.6) = 105
    assert result.realistic == 105
    assert result.source == EstimateSource.HISTORICAL


def test_history_with_fewer_than_three_samples_is_ignored():
    """Rule: fewer than 3 samples never adjust the heuristic; source stays HEURISTIC."""
    history = [HistorySample(estimated_minutes=60, actual_minutes=120)] * 2
    result = ENGINE.estimate(make_task(), history)
    assert result.realistic == 150
    assert result.source == EstimateSource.HEURISTIC
    assert result.confidence == pytest.approx(0.73)


def test_history_samples_with_nonpositive_minutes_do_not_count():
    """Rule: samples with zero estimated or actual minutes yield no ratio, so 2 valid of 3 total is still ignored."""
    history = [
        HistorySample(estimated_minutes=60, actual_minutes=120),
        HistorySample(estimated_minutes=60, actual_minutes=120),
        HistorySample(estimated_minutes=0, actual_minutes=120),
    ]
    result = ENGINE.estimate(make_task(), history)
    assert result.realistic == 150
    assert result.source == EstimateSource.HEURISTIC


def test_confidence_falls_as_complexity_and_knowledge_rise():
    """Rule: confidence starts at 0.85 and drops 0.06 per complexity step plus 0.05 for knowledge-heavy tasks."""
    assert ENGINE.estimate(make_task(complexity=1)).confidence == pytest.approx(0.85)
    assert ENGINE.estimate(make_task(complexity=3)).confidence == pytest.approx(0.73)
    assert ENGINE.estimate(make_task(complexity=5)).confidence == pytest.approx(0.61)
    assert ENGINE.estimate(make_task(knowledge_value=4)).confidence == pytest.approx(0.68)
    assert (
        ENGINE.estimate(make_task(complexity=5)).confidence
        < ENGINE.estimate(make_task(complexity=1)).confidence
    )


def test_confidence_clamped_at_095_for_consistent_history():
    """Rule: consistent history adds up to +0.2 confidence but the result clamps at 0.95."""
    history = [HistorySample(estimated_minutes=60, actual_minutes=60)] * 3  # bias 1.0, spread 0
    result = ENGINE.estimate(make_task(complexity=1), history)  # base confidence 0.85 -> 1.05 raw
    assert result.confidence == 0.95
    assert result.realistic == 75  # bias 1.0 leaves the heuristic unchanged


def test_erratic_history_lowers_confidence_within_bounds():
    """Rule: high-spread history subtracts confidence (floored at -0.2) and the result stays in [0.2, 0.95]."""
    erratic = [
        HistorySample(estimated_minutes=100, actual_minutes=20),
        HistorySample(estimated_minutes=100, actual_minutes=100),
        HistorySample(estimated_minutes=100, actual_minutes=500),
    ]
    consistent = [HistorySample(estimated_minutes=100, actual_minutes=100)] * 3
    task = make_task(complexity=5, knowledge_value=5)
    erratic_result = ENGINE.estimate(task, erratic)
    consistent_result = ENGINE.estimate(task, consistent)
    no_history_result = ENGINE.estimate(task)
    # 0.85 - 0.24 - 0.05 - 0.2 (max spread penalty) = 0.36
    assert erratic_result.confidence == pytest.approx(0.36)
    assert erratic_result.confidence < no_history_result.confidence < consistent_result.confidence
    for result in (erratic_result, consistent_result, no_history_result):
        assert 0.2 <= result.confidence <= 0.95


def test_realistic_and_optimistic_never_drop_below_five_minutes():
    """Rule: even with a strong downward historical bias, realistic and optimistic floor at 5 minutes."""
    tiny = make_task(task_type=TaskType.ADMIN, complexity=1, difficulty=1)
    history = [HistorySample(estimated_minutes=1000, actual_minutes=1)] * 3
    result = ENGINE.estimate(tiny, history)
    assert result.realistic == 5
    assert result.optimistic == 5
    assert result.optimistic <= result.realistic <= result.pessimistic
