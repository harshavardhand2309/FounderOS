"""Knowledge scoring.

Completion alone never equals knowledge: a task's learning score is earned by
checking off learning activities, weighted per ``shared/constants.json``.
"""

from __future__ import annotations

from app.core.config import ScoringConstants
from app.domain.entities import KnowledgeChecklist

# Checklist flags in presentation order; must match constants keys.
CHECKLIST_FIELDS: tuple[str, ...] = (
    "read_docs",
    "read_paper",
    "summarized",
    "explained_own_words",
    "compared_alternatives",
    "implemented",
)


class KnowledgeScorer:
    def __init__(self, constants: ScoringConstants) -> None:
        self._weights = constants.knowledge_checklist_weights

    def score(self, checklist: KnowledgeChecklist) -> float:
        total = sum(self._weights.get(field, 0) for field in CHECKLIST_FIELDS)
        if total <= 0:
            return 0.0
        earned = sum(
            self._weights.get(field, 0)
            for field in CHECKLIST_FIELDS
            if getattr(checklist, field, False)
        )
        return round(earned / total * 100, 1)
