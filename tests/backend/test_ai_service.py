"""AI service tests using a fake in-process provider (no network)."""

from __future__ import annotations

import json

import pytest
from sqlmodel import Session

from app.application.services.ai_service import AIService, AIUnavailableError
from app.infrastructure.llm.base import CompletionRequest, LLMProvider, extract_json
from app.infrastructure.repositories import ProjectRepository, TaskRepository
from app.presentation.api.deps import get_task_service


class FakeProvider(LLMProvider):
    name = "fake"

    def __init__(self, response: str) -> None:
        self.response = response
        self.requests: list[CompletionRequest] = []

    def complete(self, request: CompletionRequest) -> str:
        self.requests.append(request)
        return self.response

    def is_available(self) -> bool:
        return True


def _service(session: Session, provider: LLMProvider | None) -> AIService:
    return AIService(
        provider=provider,
        tasks=TaskRepository(session),
        projects=ProjectRepository(session),
        task_service=get_task_service(session),
    )


def test_extract_json_handles_fences_prose_and_think_blocks() -> None:
    """Local models wrap JSON in fences/prose/<think>; extractor must cope."""
    assert extract_json('{"a": 1}') == {"a": 1}
    assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert extract_json('Sure! Here you go: {"a": [1, 2]} hope that helps') == {"a": [1, 2]}
    assert extract_json('<think>hmm {"x": 9}</think>{"a": 1}') == {"a": 1}


def test_generate_subtasks_creates_children(session: Session) -> None:
    """Valid subtask specs become child tasks under the parent."""
    task_service = get_task_service(session)
    parent = task_service.create({"title": "Build RAG pipeline", "status": "ready"})
    provider = FakeProvider(
        json.dumps(
            {
                "subtasks": [
                    {"title": "Read retrieval papers", "task_type": "reading", "estimated_minutes": 60},
                    {"title": "Implement chunking", "task_type": "coding"},
                    {"title": "", "task_type": "coding"},  # dropped: empty title
                    {"title": "Weird type", "task_type": "nonsense"},  # type falls back to parent's
                ]
            }
        )
    )
    result = _service(session, provider).generate_subtasks(parent.id, create=True)
    assert [s["title"] for s in result] == ["Read retrieval papers", "Implement chunking", "Weird type"]

    children = task_service.subtasks(parent.id)
    assert len(children) == 3
    assert {c.parent_id for c in children} == {parent.id}
    assert provider.requests[0].json_mode is True


def test_ai_unavailable_without_provider(session: Session) -> None:
    task_service = get_task_service(session)
    task = task_service.create({"title": "Anything"})
    with pytest.raises(AIUnavailableError):
        _service(session, None).generate_subtasks(task.id)


def test_duplicate_detection_heuristic_fallback(session: Session) -> None:
    """Without a provider, near-identical titles are still caught."""
    task_service = get_task_service(session)
    task_service.create({"title": "Implement reranker service", "status": "ready"})
    task_service.create({"title": "Implement reranker service v2", "status": "ready"})
    task_service.create({"title": "Write investor update", "status": "ready"})

    result = _service(session, None).detect_duplicates()
    assert result["source"] == "heuristic"
    assert len(result["duplicates"]) == 1


def test_status_reports_unconfigured(session: Session) -> None:
    status = _service(session, None).status()
    assert status["available"] is False
