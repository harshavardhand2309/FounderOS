"""AI features: subtask generation, estimation, reviews, risk analysis,
duplicate/dependency detection, knowledge quizzes.

Every feature degrades gracefully: with no provider configured (or Ollama
down), deterministic heuristics answer instead where possible, and the API
reports availability so the UI can label AI output.
"""

from __future__ import annotations

from datetime import timedelta
from difflib import SequenceMatcher
from pathlib import Path
from string import Formatter
from typing import Any

from app.application.interfaces import (
    ProjectRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.application.services.task_service import TaskService
from app.core.config import PROMPTS_DIR
from app.core.logging import get_logger
from app.domain.entities import Task, utcnow
from app.domain.enums import TaskStatus, TaskType
from app.infrastructure.llm.base import CompletionRequest, LLMError, LLMProvider, extract_json

logger = get_logger("ai")

_SYSTEM = (
    "You are FounderOS, a local productivity copilot for a solo technical founder. "
    "Always respond with the exact JSON shape requested and nothing else."
)
_DUPLICATE_SIMILARITY_THRESHOLD = 0.72
_VALID_TASK_TYPES = {t.value for t in TaskType}


class AIUnavailableError(RuntimeError):
    """No provider configured/reachable and no heuristic fallback exists."""


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


def _render(template: str, **values: Any) -> str:
    """format() that tolerates literal JSON braces in templates ({{ }})."""
    formatter = Formatter()
    return formatter.vformat(template, (), _SafeDict(values))


class _SafeDict(dict):
    def __missing__(self, key: str) -> str:  # pragma: no cover - defensive
        return "n/a"


class AIService:
    def __init__(
        self,
        provider: LLMProvider | None,
        tasks: TaskRepositoryProtocol,
        projects: ProjectRepositoryProtocol,
        task_service: TaskService,
    ) -> None:
        self._provider = provider
        self._tasks = tasks
        self._projects = projects
        self._task_service = task_service

    # Status ---------------------------------------------------------------

    def status(self) -> dict[str, Any]:
        if self._provider is None:
            return {"available": False, "provider": None, "detail": "No provider configured"}
        available = self._provider.is_available()
        return {
            "available": available,
            "provider": self._provider.name,
            "detail": "ready" if available else "provider unreachable — heuristics in use",
        }

    def _complete_json(self, prompt: str) -> dict | list:
        if self._provider is None:
            raise AIUnavailableError("AI provider not configured")
        try:
            text = self._provider.complete(
                CompletionRequest(prompt=prompt, system=_SYSTEM, json_mode=True)
            )
            return extract_json(text)
        except LLMError as exc:
            raise AIUnavailableError(str(exc)) from exc

    # Subtasks -------------------------------------------------------------

    def generate_subtasks(self, task_id: str, create: bool = True) -> list[dict[str, Any]]:
        task = self._require_task(task_id)
        prompt = _render(
            _load_prompt("subtasks"),
            title=task.title,
            description=task.description or "(none)",
            task_type=task.task_type.value,
            complexity=task.complexity,
            knowledge_value=task.knowledge_value,
        )
        data = self._complete_json(prompt)
        raw = data.get("subtasks", []) if isinstance(data, dict) else []
        subtasks: list[dict[str, Any]] = []
        for item in raw[:7]:
            title = str(item.get("title", "")).strip()
            if not title:
                continue
            task_type = str(item.get("task_type", task.task_type.value))
            if task_type not in _VALID_TASK_TYPES:
                task_type = task.task_type.value
            minutes = item.get("estimated_minutes")
            minutes = int(minutes) if isinstance(minutes, (int, float)) and minutes > 0 else None
            subtasks.append({"title": title, "task_type": task_type, "estimated_minutes": minutes})

        if create:
            for spec in subtasks:
                self._task_service.create(
                    {
                        "title": spec["title"],
                        "project_id": task.project_id,
                        "epic_id": task.epic_id,
                        "parent_id": task.id,
                        "status": TaskStatus.BACKLOG,
                        "task_type": TaskType(spec["task_type"]),
                        "estimated_minutes": spec["estimated_minutes"],
                        "importance": task.importance,
                        "knowledge_value": task.knowledge_value,
                    }
                )
        return subtasks

    # Estimation -----------------------------------------------------------

    def suggest_estimate(self, task_id: str) -> dict[str, Any]:
        task = self._require_task(task_id)
        samples = self._tasks.completed_samples(task.task_type.value, 20)
        ratios = [a / e for e, a in samples if e > 0 and a > 0]
        bias = f"{sum(ratios) / len(ratios):.2f}x" if ratios else "no history"
        prompt = _render(
            _load_prompt("estimate"),
            title=task.title,
            description=task.description or "(none)",
            task_type=task.task_type.value,
            complexity=task.complexity,
            difficulty=task.difficulty,
            historical_bias=bias,
        )
        data = self._complete_json(prompt)
        if not isinstance(data, dict):
            raise AIUnavailableError("Malformed estimate response")
        return data

    # Duplicates -----------------------------------------------------------

    def detect_duplicates(self) -> dict[str, Any]:
        """LLM when available; title-similarity heuristic otherwise."""
        open_tasks = self._tasks.list_all_open()
        if self._provider is not None and self._provider.is_available():
            listing = "\n".join(f"- id={t.id} :: {t.title}" for t in open_tasks[:60])
            try:
                data = self._complete_json(_render(_load_prompt("duplicates"), tasks=listing))
                if isinstance(data, dict):
                    valid_ids = {t.id for t in open_tasks}
                    pairs = [
                        p
                        for p in data.get("duplicates", [])
                        if p.get("id_a") in valid_ids and p.get("id_b") in valid_ids
                    ]
                    return {"duplicates": pairs, "source": "ai"}
            except AIUnavailableError:
                pass  # fall through to heuristic

        pairs = []
        for i, a in enumerate(open_tasks):
            for b in open_tasks[i + 1 :]:
                similarity = SequenceMatcher(None, a.title.lower(), b.title.lower()).ratio()
                if similarity >= _DUPLICATE_SIMILARITY_THRESHOLD:
                    pairs.append(
                        {"id_a": a.id, "id_b": b.id, "reason": f"titles {similarity:.0%} similar"}
                    )
        return {"duplicates": pairs, "source": "heuristic"}

    # Dependency suggestions ----------------------------------------------

    def suggest_dependencies(self, task_id: str) -> dict[str, Any]:
        task = self._require_task(task_id)
        others = [t for t in self._tasks.list_all_open() if t.id != task_id][:40]
        listing = "\n".join(f"- id={t.id} :: {t.title}" for t in others)
        data = self._complete_json(
            _render(
                _load_prompt("dependencies"),
                title=task.title,
                description=task.description or "(none)",
                other_tasks=listing or "(none)",
            )
        )
        if not isinstance(data, dict):
            raise AIUnavailableError("Malformed dependencies response")
        valid_ids = {t.id for t in others}
        suggestions = [d for d in data.get("depends_on", []) if d.get("id") in valid_ids]
        return {"depends_on": suggestions}

    # Reviews --------------------------------------------------------------

    def daily_review(self) -> dict[str, Any]:
        now = utcnow()
        completed = self._tasks.completed_between(
            now.replace(hour=0, minute=0, second=0, microsecond=0), now + timedelta(days=1)
        )
        open_tasks = sorted(
            self._tasks.list_all_open(), key=lambda t: -t.priority_score
        )[:8]
        data = self._complete_json(
            _render(
                _load_prompt("daily_review"),
                plan_summary=f"{len(completed)} tasks completed",
                completed="\n".join(f"- {t.title}" for t in completed) or "(nothing completed)",
                open_tasks="\n".join(
                    f"- {t.title} (score {t.priority_score:.0f})" for t in open_tasks
                )
                or "(none)",
            )
        )
        if not isinstance(data, dict):
            raise AIUnavailableError("Malformed review response")
        return data

    def weekly_review(self) -> dict[str, Any]:
        now = utcnow()
        completed = self._tasks.completed_between(now - timedelta(days=7), now + timedelta(days=1))
        projects = self._projects.list()
        project_lines = "\n".join(
            f"- {p.name} ({p.priority.value}, {p.status.value})" for p in projects
        )
        data = self._complete_json(
            _render(
                _load_prompt("weekly_review"),
                completed_count=len(completed),
                completed="\n".join(f"- {t.title}" for t in completed[:30]) or "(none)",
                projects=project_lines or "(none)",
                velocity=f"{len(completed) / 7:.1f}",
                knowledge_score="n/a",
            )
        )
        if not isinstance(data, dict):
            raise AIUnavailableError("Malformed review response")
        return data

    # Risk -----------------------------------------------------------------

    def risk_analysis(self, project_id: str) -> dict[str, Any]:
        project = self._projects.get(project_id)
        if project is None:
            raise KeyError("Project not found")
        tasks = self._tasks.list(project_id=project_id)
        open_tasks = [t for t in tasks if t.status in TaskStatus.open_statuses()]
        blocked = [t for t in open_tasks if t.status == TaskStatus.BLOCKED]
        remaining_minutes = sum(
            (t.estimated_minutes or 60) - min(t.actual_minutes, t.estimated_minutes or 60)
            for t in open_tasks
        )
        data = self._complete_json(
            _render(
                _load_prompt("risk"),
                name=project.name,
                description=project.description or "(none)",
                deadline=project.deadline.isoformat() if project.deadline else "none",
                progress_pct="n/a",
                remaining_hours=f"{remaining_minutes / 60:.0f}",
                burn_rate="n/a",
                open_count=len(open_tasks),
                open_tasks="\n".join(f"- {t.title}" for t in open_tasks[:20]) or "(none)",
                blocked="\n".join(f"- {t.title}: {t.blocked_reason}" for t in blocked) or "(none)",
            )
        )
        if not isinstance(data, dict):
            raise AIUnavailableError("Malformed risk response")
        return data

    # Quiz -----------------------------------------------------------------

    def knowledge_quiz(self, task_id: str) -> dict[str, Any]:
        task = self._require_task(task_id)
        data = self._complete_json(
            _render(
                _load_prompt("quiz"),
                title=task.title,
                context=task.description or "(no notes)",
            )
        )
        if not isinstance(data, dict):
            raise AIUnavailableError("Malformed quiz response")
        return data

    # Internals ------------------------------------------------------------

    def _require_task(self, task_id: str) -> Task:
        task = self._tasks.get(task_id)
        if task is None:
            raise KeyError("Task not found")
        return task
