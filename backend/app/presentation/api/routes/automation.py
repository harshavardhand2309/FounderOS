"""Automation endpoints: morning compile, workspace management, and ad-hoc
document intake."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.application.services.document_intake import DocumentIntakeService, extract_text
from app.application.services.morning_compile import run_morning_compile
from app.application.services.workspace_scanner import (
    WorkspaceScanner,
    effective_workspaces,
    ensure_project_for_workspace,
    user_workspaces,
    workspace_board_name,
)
from app.core.config import get_settings
from app.infrastructure.llm.factory import resolve_provider
from app.infrastructure.repositories import (
    NoteRepository,
    PrefsRepository,
    ProjectRepository,
    ReadingRepository,
)
from app.presentation.api.deps import SessionDep, get_task_service

router = APIRouter(prefix="/automation", tags=["automation"])

_MAX_UPLOAD_BYTES = 25 * 1024 * 1024


class WorkspaceAddRequest(BaseModel):
    path: str = Field(min_length=1, max_length=1000)
    scan_now: bool = False


def get_intake_service(session: SessionDep) -> DocumentIntakeService:
    settings = get_settings()
    return DocumentIntakeService(
        provider=resolve_provider(settings),
        notes=NoteRepository(session),
        reading=ReadingRepository(session),
        task_service=get_task_service(session),
    )


IntakeServiceDep = Annotated[DocumentIntakeService, Depends(get_intake_service)]


def _active_model(settings) -> str:  # noqa: ANN001
    if settings.llm_provider == "anthropic":
        return settings.anthropic_model
    if settings.llm_provider in ("claude-code", "claude_code", "claudecode"):
        return settings.claude_code_model or "(CLI default)"
    return settings.llm_model


@router.get("/status")
def automation_status(session: SessionDep) -> dict:
    settings = get_settings()
    prefs = PrefsRepository(session).get()
    return {
        "morning_compile_enabled": settings.morning_compile_enabled,
        "morning_compile_time": settings.morning_compile_time,
        "timezone": settings.timezone,
        "workspaces": effective_workspaces(settings, prefs),
        "llm_provider": settings.llm_provider,
        "llm_model": _active_model(settings),
    }


# Workspaces -----------------------------------------------------------------


@router.get("/workspaces")
def list_workspaces(session: SessionDep) -> dict:
    settings = get_settings()
    prefs = PrefsRepository(session).get()
    return {
        "env": settings.workspaces,
        "user": user_workspaces(prefs),
        "effective": effective_workspaces(settings, prefs),
    }


@router.post("/workspaces", status_code=201)
def add_workspace(payload: WorkspaceAddRequest, session: SessionDep) -> dict:
    """Register a workspace: creates its board immediately and (optionally)
    runs an initial scan so tasks appear right away."""
    settings = get_settings()
    path = Path(payload.path).expanduser()
    if not path.is_dir():
        raise HTTPException(status_code=422, detail=f"Directory not found: {path}")

    prefs_repo = PrefsRepository(session)
    prefs = prefs_repo.get()
    resolved = str(path)
    if resolved in effective_workspaces(settings, prefs):
        raise HTTPException(status_code=409, detail="Workspace already registered")

    # JSON columns don't track in-place mutation — assign a fresh dict.
    extra = dict(prefs.extra) if isinstance(prefs.extra, dict) else {}
    extra["workspaces"] = [*user_workspaces(prefs), resolved]
    prefs.extra = extra
    prefs_repo.save(prefs)

    project = ensure_project_for_workspace(
        workspace_board_name(resolved), ProjectRepository(session)
    )

    scan_result = None
    if payload.scan_now:
        scanner = WorkspaceScanner(
            provider=resolve_provider(settings), task_service=get_task_service(session)
        )
        result = scanner.scan_workspace(resolved, project)
        scan_result = {
            "created_tasks": result.created_tasks,
            "skipped_duplicates": result.skipped_duplicates,
            "source": result.source,
        }

    return {
        "path": resolved,
        "project_id": project.id,
        "project_name": project.name,
        "scan": scan_result,
    }


@router.delete("/workspaces", status_code=204)
def remove_workspace(path: str, session: SessionDep) -> None:
    settings = get_settings()
    resolved = str(Path(path).expanduser())
    if resolved in settings.workspaces or path in settings.workspaces:
        raise HTTPException(
            status_code=409,
            detail="Configured via FOUNDEROS_WORKSPACES — remove it from the env var",
        )
    prefs_repo = PrefsRepository(session)
    prefs = prefs_repo.get()
    current = user_workspaces(prefs)
    if resolved not in current and path not in current:
        raise HTTPException(status_code=404, detail="Workspace not registered")
    extra = dict(prefs.extra) if isinstance(prefs.extra, dict) else {}
    extra["workspaces"] = [w for w in current if w not in (resolved, path)]
    prefs.extra = extra
    prefs_repo.save(prefs)


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
