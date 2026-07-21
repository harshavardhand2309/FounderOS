"""Ad-hoc document intake.

Upload a document ("these are the docs we need to study and review") and
FounderOS parses it, estimates realistic study time (AI-refined when a
provider is configured, deterministic otherwise), and creates the artifacts:
a Note holding the content, a ReadingItem in the learning queue, and a
ready-to-schedule study Task with the estimate attached — so the user can
decide when to place and how to prioritize it, or just let the next plan
generation slot it.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass
from string import Formatter
from typing import Any

from app.application.services.task_service import TaskService
from app.core.config import PROMPTS_DIR
from app.core.logging import get_logger
from app.domain.entities import Note, ReadingItem
from app.domain.enums import (
    NoteKind,
    Priority,
    ReadingKind,
    ReadingStatus,
    TaskStatus,
    TaskType,
)
from app.infrastructure.llm.base import CompletionRequest, LLMError, LLMProvider, extract_json
from app.infrastructure.repositories import NoteRepository, ReadingRepository

logger = get_logger("intake")

_WORDS_PER_MINUTE_LIGHT = 200
_WORDS_PER_MINUTE_TECHNICAL = 150
_WORDS_PER_MINUTE_ACADEMIC = 110
_SUMMARY_BASE_MINUTES = 15
_EXCERPT_CHARS = 3000
_MAX_STORED_CHARS = 200_000
_VALID_PRIORITIES = {p.value for p in Priority}

_SYSTEM = (
    "You are FounderOS's reading analyst. Respond with the exact JSON shape "
    "requested and nothing else."
)


@dataclass(frozen=True)
class IntakeResult:
    note_id: str
    reading_item_id: str
    task_id: str
    title: str
    word_count: int
    estimated_minutes: int
    reading_minutes: int
    summary_minutes: int
    density: str
    summary: str
    suggested_priority: str
    key_topics: list[str]
    source: str  # "ai" | "heuristic"


def extract_text(filename: str, payload: bytes) -> str:
    """Pull plain text out of an uploaded document (md/txt/pdf)."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        from pypdf import PdfReader

        try:
            reader = PdfReader(io.BytesIO(payload))
            return "\n\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:  # pypdf raises a zoo of exception types
            raise ValueError(f"Could not parse PDF: {exc}") from exc
    try:
        return payload.decode("utf-8")
    except UnicodeDecodeError:
        return payload.decode("latin-1", errors="replace")


def _heuristic_estimate(text: str, word_count: int) -> dict[str, Any]:
    # Density proxy: long sentences + math/code markers read slower.
    sentences = max(1, len(re.findall(r"[.!?]\s", text[:20_000])))
    words_in_sample = len(text[:20_000].split())
    avg_sentence_len = words_in_sample / sentences
    has_dense_markers = bool(re.search(r"(\\\w+|∑|∫|θ|def |class |import |Theorem|Lemma)", text[:20_000]))

    if has_dense_markers or avg_sentence_len > 28:
        density, wpm = "academic", _WORDS_PER_MINUTE_ACADEMIC
    elif avg_sentence_len > 20:
        density, wpm = "technical", _WORDS_PER_MINUTE_TECHNICAL
    else:
        density, wpm = "light", _WORDS_PER_MINUTE_LIGHT

    reading = max(5, round(word_count / wpm))
    summary = _SUMMARY_BASE_MINUTES + min(15, reading // 6)
    return {
        "estimated_minutes": reading + summary,
        "reading_minutes": reading,
        "summary_minutes": summary,
        "density": density,
        "summary": "",
        "suggested_priority": "medium",
        "key_topics": [],
    }


class DocumentIntakeService:
    def __init__(
        self,
        provider: LLMProvider | None,
        notes: NoteRepository,
        reading: ReadingRepository,
        task_service: TaskService,
    ) -> None:
        self._provider = provider
        self._notes = notes
        self._reading = reading
        self._task_service = task_service

    def intake(
        self,
        title: str,
        text: str,
        project_id: str | None = None,
        instruction: str = "",
    ) -> IntakeResult:
        text = text.strip()
        if not text:
            raise ValueError("Document is empty")
        word_count = len(text.split())

        estimate = _heuristic_estimate(text, word_count)
        source = "heuristic"
        if self._provider is not None and self._provider.is_available():
            refined = self._ai_estimate(title, text, word_count)
            if refined is not None:
                # Keep heuristic figures as floors — models sometimes lowball.
                refined["reading_minutes"] = max(
                    int(refined.get("reading_minutes") or 0), estimate["reading_minutes"] // 2
                )
                refined["estimated_minutes"] = max(
                    int(refined.get("estimated_minutes") or 0),
                    refined["reading_minutes"] + _SUMMARY_BASE_MINUTES,
                )
                estimate = {**estimate, **refined}
                source = "ai"

        note = self._notes.add(
            Note(
                title=title,
                kind=NoteKind.RESEARCH,
                content_md=text[:_MAX_STORED_CHARS],
                project_id=project_id,
                tags=["intake"] + [t for t in estimate.get("key_topics", []) if isinstance(t, str)][:5],
            )
        )
        reading_item = self._reading.add(
            ReadingItem(
                title=title,
                kind=ReadingKind.DOCS,
                status=ReadingStatus.QUEUED,
                project_id=project_id,
                note_id=note.id,
            )
        )
        priority = estimate.get("suggested_priority", "medium")
        task = self._task_service.create(
            {
                "title": f"Study & review: {title}",
                "description": (
                    (instruction + "\n\n" if instruction else "")
                    + (estimate.get("summary") or f"{word_count} words, {estimate['density']} density.")
                ),
                "project_id": project_id,
                "status": TaskStatus.READY,
                "task_type": TaskType.READING,
                "priority": Priority(priority) if priority in _VALID_PRIORITIES else Priority.MEDIUM,
                "estimated_minutes": int(estimate["estimated_minutes"]),
                "knowledge_value": 4,
                "importance": 3,
                "labels": ["intake"],
            }
        )
        # Link artifacts both ways.
        self._task_service.update(task.id, {"links": [f"note:{note.id}"]})
        note.task_id = task.id
        self._notes.save(note)
        reading_item.task_id = task.id
        self._reading.save(reading_item)

        return IntakeResult(
            note_id=note.id,
            reading_item_id=reading_item.id,
            task_id=task.id,
            title=title,
            word_count=word_count,
            estimated_minutes=int(estimate["estimated_minutes"]),
            reading_minutes=int(estimate["reading_minutes"]),
            summary_minutes=int(estimate["summary_minutes"]),
            density=str(estimate["density"]),
            summary=str(estimate.get("summary") or ""),
            suggested_priority=str(priority),
            key_topics=[t for t in estimate.get("key_topics", []) if isinstance(t, str)][:8],
            source=source,
        )

    def _ai_estimate(self, title: str, text: str, word_count: int) -> dict[str, Any] | None:
        class _SafeDict(dict):
            def __missing__(self, key: str) -> str:
                return "n/a"

        prompt = Formatter().vformat(
            (PROMPTS_DIR / "intake.md").read_text(encoding="utf-8"),
            (),
            _SafeDict(title=title, word_count=word_count, excerpt=text[:_EXCERPT_CHARS]),
        )
        try:
            data = extract_json(
                self._provider.complete(  # type: ignore[union-attr]
                    CompletionRequest(prompt=prompt, system=_SYSTEM, json_mode=True)
                )
            )
            return data if isinstance(data, dict) else None
        except LLMError as exc:
            logger.warning("AI intake estimate failed (%s); using heuristic", exc)
            return None
