"""Automation endpoints: morning compile and ad-hoc document intake."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.application.services.document_intake import DocumentIntakeService, extract_text
from app.application.services.morning_compile import run_morning_compile
from app.core.config import get_settings
from app.infrastructure.llm.factory import resolve_provider
from app.infrastructure.repositories import NoteRepository, ReadingRepository
from app.presentation.api.deps import SessionDep, get_task_service

router = APIRouter(prefix="/automation", tags=["automation"])

_MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def get_intake_service(session: SessionDep) -> DocumentIntakeService:
    settings = get_settings()
    return DocumentIntakeService(
        provider=resolve_provider(settings),
        notes=NoteRepository(session),
        reading=ReadingRepository(session),
        task_service=get_task_service(session),
    )


IntakeServiceDep = Annotated[DocumentIntakeService, Depends(get_intake_service)]


@router.get("/status")
def automation_status() -> dict:
    settings = get_settings()
    return {
        "morning_compile_enabled": settings.morning_compile_enabled,
        "morning_compile_time": settings.morning_compile_time,
        "timezone": settings.timezone,
        "workspaces": settings.workspaces,
        "llm_provider": settings.llm_provider,
        "llm_model": (
            settings.anthropic_model if settings.llm_provider == "anthropic" else settings.llm_model
        ),
    }


@router.post("/compile")
def compile_now(session: SessionDep) -> dict:
    """Run the morning compile immediately (same pipeline as the 6 AM job)."""
    report = run_morning_compile(session)
    return report.to_dict()


@router.post("/intake/document")
async def intake_document(
    service: IntakeServiceDep,
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    title: str | None = Form(default=None),
    project_id: str | None = Form(default=None),
    instruction: str = Form(default=""),
) -> dict:
    """Parse an uploaded/pasted document, estimate study time, and create the
    note + reading item + ready-to-schedule task."""
    if file is None and not (text and text.strip()):
        raise HTTPException(status_code=422, detail="Provide a file or non-empty text")

    if file is not None:
        payload = await file.read()
        if len(payload) > _MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds 25 MB limit")
        filename = file.filename or "document.txt"
        try:
            content = extract_text(filename, payload)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from None
        resolved_title = title or filename.rsplit(".", 1)[0]
    else:
        content = text or ""
        resolved_title = title or (content.strip().splitlines()[0][:80] if content.strip() else "Document")

    try:
        result = service.intake(
            title=resolved_title,
            text=content,
            project_id=project_id or None,
            instruction=instruction,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None
    return result.__dict__
