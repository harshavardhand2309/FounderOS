"""Tests for the knowledge checklist scorer (pure, no DB needed)."""

from __future__ import annotations

import json

import pytest

from app.application.engines.knowledge import CHECKLIST_FIELDS, KnowledgeScorer
from app.core.config import SHARED_CONSTANTS_PATH, ScoringConstants, get_shared_constants


def load_json_weights() -> dict[str, int]:
    with SHARED_CONSTANTS_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)["scoring"]["knowledge_checklist_weights"]


def make_checklist(**checked: bool):
    from app.domain.entities import KnowledgeChecklist

    return KnowledgeChecklist(task_id="t1", **checked)


@pytest.fixture()
def scorer() -> KnowledgeScorer:
    return KnowledgeScorer(get_shared_constants().scoring)


def test_score_is_zero_when_nothing_checked(scorer):
    """An untouched checklist earns a knowledge score of 0."""
    assert scorer.score(make_checklist()) == 0.0


def test_score_is_hundred_when_everything_checked(scorer):
    """Checking every learning activity earns the full score of 100."""
    checklist = make_checklist(**{field: True for field in CHECKLIST_FIELDS})
    assert scorer.score(checklist) == 100.0


def test_partial_score_matches_constants_weights(scorer):
    """A partial checklist scores the sum of its checked weights per constants.json."""
    weights = load_json_weights()
    checklist = make_checklist(read_docs=True, implemented=True)
    expected = round((weights["read_docs"] + weights["implemented"]) / sum(weights.values()) * 100, 1)
    assert scorer.score(checklist) == expected
    # With the shipped constants (10 + 20 out of 100) that is exactly 30.0.
    assert scorer.score(checklist) == 30.0


@pytest.mark.parametrize("field", CHECKLIST_FIELDS)
def test_each_single_flag_scores_its_own_weight(scorer, field):
    """Each flag alone contributes exactly its weight share from constants.json."""
    weights = load_json_weights()
    total = sum(weights[f] for f in CHECKLIST_FIELDS)
    checklist = make_checklist(**{field: True})
    assert scorer.score(checklist) == round(weights[field] / total * 100, 1)


def test_constants_weights_cover_all_checklist_fields():
    """shared/constants.json defines a weight for every checklist field."""
    weights = load_json_weights()
    assert set(weights) == set(CHECKLIST_FIELDS)


def test_zero_total_weights_scores_zero():
    """Empty or all-zero weights yield 0 instead of dividing by zero."""
    scorer = KnowledgeScorer(ScoringConstants(knowledge_checklist_weights={}))
    checklist = make_checklist(**{field: True for field in CHECKLIST_FIELDS})
    assert scorer.score(checklist) == 0.0


def test_unknown_weight_keys_do_not_dilute_the_score():
    """Weights for keys outside CHECKLIST_FIELDS are ignored entirely."""
    scorer = KnowledgeScorer(
        ScoringConstants(knowledge_checklist_weights={"read_docs": 10, "bogus": 90})
    )
    assert scorer.score(make_checklist(read_docs=True)) == 100.0


def test_score_rounds_to_one_decimal():
    """Scores are rounded to a single decimal place."""
    scorer = KnowledgeScorer(
        ScoringConstants(
            knowledge_checklist_weights={"read_docs": 1, "read_paper": 1, "summarized": 1}
        )
    )
    assert scorer.score(make_checklist(read_docs=True)) == 33.3
