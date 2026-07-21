"""Workspace scanner: turns local coding workspaces into board tasks.

For each configured workspace (a local repo/directory), the scanner collects
cheap static signals — recent commits, dirty files, TODO/FIXME markers — and
asks the LLM (Opus 4.8 when configured) to derive concrete tasks: testing,
bug fixing, reading/review, development. Tasks land on that workspace's own
project board with estimates, deduplicated against existing open work.

Without a reachable provider it degrades to a deterministic heuristic:
TODO/FIXME markers and dirty files become review/fix tasks directly.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path
from string import Formatter
from typing import Any

from app.application.services.task_service import TaskService
from app.core.config import PROMPTS_DIR
from app.core.logging import get_logger
from app.domain.entities import Project
from app.domain.enums import Priority, ProjectStatus, TaskStatus, TaskType
from app.infrastructure.llm.base import CompletionRequest, LLMError, LLMProvider, extract_json

logger = get_logger("workspace_scanner")

_GIT_TIMEOUT_SECONDS = 15
_MAX_COMMITS = 15
_MAX_TODOS = 30
_MAX_DIRTY_FILES = 30
_DEDUPE_SIMILARITY = 0.75
_MAX_TASKS_PER_WORKSPACE = 6
_VALID_TASK_TYPES = {t.value for t in TaskType}
_VALID_PRIORITIES = {p.value for p in Priority}
_TODO_GLOBS = ("*.py", "*.ts", "*.tsx", "*.js", "*.jsx", "*.go", "*.rs", "*.md")

_SYSTEM = (
    "You are FounderOS's workspace analyst. Respond with the exact JSON shape "
    "requested and nothing else."
)


@dataclass(frozen=True)
class WorkspaceSnapshot:
    name: str
    path: str
    commits: list[str] = field(default_factory=list)
    dirty_files: list[str] = field(default_factory=list)
    todos: list[str] = field(default_factory=list)
    error: str | None = None


@dataclass(frozen=True)
class WorkspaceResult:
    workspace: str
    project_id: str | None
    created_tasks: list[str]
    skipped_duplicates: int
    source: str  # "ai" | "heuristic" | "error"
    detail: str = ""


def _run_git(path: Path, *args: str) -> str:
    try:
        completed = subprocess.run(
            ["git", "-C", str(path), *args],
            capture_output=True,
            text=True,
            timeout=_GIT_TIMEOUT_SECONDS,
        )
        return completed.stdout if completed.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def snapshot_workspace(path_str: str) -> WorkspaceSnapshot:
    path = Path(path_str).expanduser()
    name = path.name or path_str
    if not path.is_dir():
        return WorkspaceSnapshot(name=name, path=str(path), error="directory not found")

    commits = [
        line
        for line in _run_git(path, "log", "--oneline", f"-{_MAX_COMMITS}", "--no-color").splitlines()
        if line.strip()
    ]
    dirty = [
        line.strip()
        for line in _run_git(path, "status", "--porcelain").splitlines()
        if line.strip()
    ][:_MAX_DIRTY_FILES]

    todos: list[str] = []
    for pattern in _TODO_GLOBS:
        if len(todos) >= _MAX_TODOS:
            break
        for file in path.rglob(pattern):
            if len(todos) >= _MAX_TODOS:
                break
            parts = set(file.parts)
            if parts & {"node_modules", ".git", ".venv", "dist", "build", "__pycache__"}:
                continue
            try:
                with file.open("r", encoding="utf-8", errors="ignore") as fh:
                    for line_no, line in enumerate(fh, 1):
                        if "TODO" in line or "FIXME" in line:
                            relative = file.relative_to(path)
                            todos.append(f"{relative}:{line_no}: {line.strip()[:160]}")
                            if len(todos) >= _MAX_TODOS:
                                break
            except OSError:
                continue

    return WorkspaceSnapshot(name=name, path=str(path), commits=commits, dirty_files=dirty, todos=todos)


class _SafeDict(dict):
    def __missing__(self, key: str) -> str:  # pragma: no cover - defensive
        return "n/a"


def _render(template: str, **values: Any) -> str:
    return Formatter().vformat(template, (), _SafeDict(values))


class WorkspaceScanner:
    def __init__(self, provider: LLMProvider | None, task_service: TaskService) -> None:
        self._provider = provider
        self._task_service = task_service

    def scan_workspace(self, path_str: str, project: Project) -> WorkspaceResult:
        snapshot = snapshot_workspace(path_str)
        if snapshot.error:
            return WorkspaceResult(
                workspace=snapshot.name,
                project_id=project.id,
                created_tasks=[],
                skipped_duplicates=0,
                source="error",
                detail=snapshot.error,
            )

        existing = [
            t.title
            for t in self._task_service.list(project_id=project.id)
            if t.status in TaskStatus.open_statuses()
        ]

        specs, source = self._derive_tasks(snapshot, existing)

        created: list[str] = []
        skipped = 0
        for spec in specs[:_MAX_TASKS_PER_WORKSPACE]:
            title = str(spec.get("title", "")).strip()
            if not title:
                continue
            if self._is_duplicate(title, existing + created):
                skipped += 1
                continue
            self._task_service.create(
                {
                    "title": title,
                    "description": str(spec.get("description", ""))[:2000],
                    "project_id": project.id,
                    "status": TaskStatus.READY,
                    "task_type": _safe_task_type(spec.get("task_type")),
                    "priority": _safe_priority(spec.get("priority")),
                    "estimated_minutes": _safe_minutes(spec.get("estimated_minutes")),
                    "importance": _clamp_scale(spec.get("importance")),
                    "complexity": _clamp_scale(spec.get("complexity")),
                    "deep_work": bool(spec.get("deep_work", False)),
                    "labels": ["morning-compile"],
                }
            )
            created.append(title)

        return WorkspaceResult(
            workspace=snapshot.name,
            project_id=project.id,
            created_tasks=created,
            skipped_duplicates=skipped,
            source=source,
        )

    # Internals ------------------------------------------------------------

    def _derive_tasks(
        self, snapshot: WorkspaceSnapshot, existing: list[str]
    ) -> tuple[list[dict[str, Any]], str]:
        if self._provider is not None and self._provider.is_available():
            try:
                prompt = _render(
                    (PROMPTS_DIR / "compile.md").read_text(encoding="utf-8"),
                    name=snapshot.name,
                    path=snapshot.path,
                    commits="\n".join(snapshot.commits) or "(no commits found)",
                    dirty="\n".join(snapshot.dirty_files) or "(clean tree)",
                    todos="\n".join(snapshot.todos) or "(none found)",
                    existing_tasks="\n".join(f"- {t}" for t in existing) or "(none)",
                )
                data = extract_json(
                    self._provider.complete(
                        CompletionRequest(prompt=prompt, system=_SYSTEM, json_mode=True)
                    )
                )
                if isinstance(data, dict) and isinstance(data.get("tasks"), list):
                    return data["tasks"], "ai"
            except LLMError as exc:
                logger.warning("LLM compile failed for %s (%s); using heuristics", snapshot.name, exc)

        return self._heuristic_tasks(snapshot), "heuristic"

    @staticmethod
    def _heuristic_tasks(snapshot: WorkspaceSnapshot) -> list[dict[str, Any]]:
        specs: list[dict[str, Any]] = []
        if snapshot.dirty_files:
            specs.append(
                {
                    "title": f"Finish and commit in-progress changes in {snapshot.name}",
                    "description": "Uncommitted files:\n" + "\n".join(snapshot.dirty_files[:10]),
                    "task_type": "coding",
                    "estimated_minutes": min(30 * len(snapshot.dirty_files), 120),
                    "importance": 4,
                    "complexity": 2,
                }
            )
        for todo in snapshot.todos[:3]:
            specs.append(
                {
                    "title": f"Address marker: {todo.split(':', 2)[-1].strip()[:80]}",
                    "description": f"Found in {snapshot.name} at {todo.split(':', 1)[0]}",
                    "task_type": "coding",
                    "estimated_minutes": 45,
                    "importance": 3,
                    "complexity": 3,
                }
            )
        if snapshot.commits:
            specs.append(
                {
                    "title": f"Review recent changes and update tests in {snapshot.name}",
                    "description": "Recent commits:\n" + "\n".join(snapshot.commits[:5]),
                    "task_type": "review",
                    "estimated_minutes": 45,
                    "importance": 3,
                    "complexity": 2,
                }
            )
        return specs

    @staticmethod
    def _is_duplicate(title: str, existing: list[str]) -> bool:
        title_l = title.lower()
        return any(
            SequenceMatcher(None, title_l, other.lower()).ratio() >= _DEDUPE_SIMILARITY
            for other in existing
        )


def _safe_task_type(value: Any) -> TaskType:
    return TaskType(value) if value in _VALID_TASK_TYPES else TaskType.CODING


def _safe_priority(value: Any) -> Priority:
    return Priority(value) if value in _VALID_PRIORITIES else Priority.NONE


def _safe_minutes(value: Any) -> int | None:
    if isinstance(value, (int, float)) and value > 0:
        return int(min(max(value, 15), 480))
    return None


def _clamp_scale(value: Any) -> int:
    if isinstance(value, (int, float)):
        return int(min(max(value, 1), 5))
    return 3


def ensure_project_for_workspace(
    name: str, projects_repo, color: str = "#0ea5e9"
) -> Project:  # noqa: ANN001 - repo protocol
    """Find (case-insensitively) or create the board for a workspace."""
    for project in projects_repo.list(include_archived=False):
        if project.name.lower() == name.lower():
            return project
    return projects_repo.add(
        Project(
            name=name,
            description=f"Auto-created board for workspace '{name}' by morning compile",
            status=ProjectStatus.ACTIVE,
            color=color,
        )
    )
