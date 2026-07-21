from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.application.services.ai_service import AIService, AIUnavailableError
from app.core.config import get_settings
from app.infrastructure.llm.factory import resolve_provider
from app.presentation.api.deps import SessionDep, get_task_service
from app.infrastructure.repositories import ProjectRepository, TaskRepository

router = APIRouter(prefix="/ai", tags=["ai"])


def get_ai_service(session: SessionDep) -> AIService:
    settings = get_settings()
    return AIService(
        provider=resolve_provider(settings),
        tasks=TaskRepository(session),
        projects=ProjectRepository(session),
        task_service=get_task_service(session),
    )


AIServiceDep = Annotated[AIService, Depends(get_ai_service)]


def _guard(fn):  # type: ignore[no-untyped-def]
    """Translate service errors to HTTP responses."""
    try:
        return fn()
    except AIUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"AI unavailable: {exc}. Start Ollama (`ollama run qwen3`) or configure a provider.",
        ) from None
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None


@router.get("/status")
def status(service: AIServiceDep) -> dict:
    return service.status()


@router.post("/tasks/{task_id}/subtasks")
def generate_subtasks(task_id: str, service: AIServiceDep, create: bool = True) -> dict:
    return {"subtasks": _guard(lambda: service.generate_subtasks(task_id, create=create))}


@router.post("/tasks/{task_id}/estimate")
def suggest_estimate(task_id: str, service: AIServiceDep) -> dict:
    return _guard(lambda: service.suggest_estimate(task_id))


@router.post("/tasks/{task_id}/dependencies")
def suggest_dependencies(task_id: str, service: AIServiceDep) -> dict:
    return _guard(lambda: service.suggest_dependencies(task_id))


@router.post("/tasks/{task_id}/quiz")
def knowledge_quiz(task_id: str, service: AIServiceDep) -> dict:
    return _guard(lambda: service.knowledge_quiz(task_id))


@router.get("/duplicates")
def detect_duplicates(service: AIServiceDep) -> dict:
    return _guard(service.detect_duplicates)


@router.post("/review/daily")
def daily_review(service: AIServiceDep) -> dict:
    return _guard(service.daily_review)


@router.post("/review/weekly")
def weekly_review(service: AIServiceDep) -> dict:
    return _guard(service.weekly_review)


@router.post("/projects/{project_id}/risk")
def risk_analysis(project_id: str, service: AIServiceDep) -> dict:
    return _guard(lambda: service.risk_analysis(project_id))
