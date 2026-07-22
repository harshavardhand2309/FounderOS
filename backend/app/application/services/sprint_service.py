"""Sprint generation: turn the backlog into a capacity-checked week plan.

The AI weekly review already proposes next-week priorities as prose; this
service makes them concrete — it selects real tasks (AI when a provider is
reachable, greedy-by-priority otherwise), fits them to weekly capacity, and
on acceptance labels them ``sprint:<week-start>``, promotes them to Ready,
and records the plan as a decision-log note.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.application.interfaces import (
    ActivityRepositoryProtocol,
    NoteRepositoryProtocol,
    PrefsRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.core.config import PROMPTS_DIR, PlannerConstants
from app.core.logging import get_logger
from app.domain.entities import Note, Task, utcnow
from app.domain.enums import ActivityKind, NoteKind, TaskStatus
from app.infrastructure.llm.base import CompletionRequest, LLMError, LLMProvider, extract_json

logger = get_logger("sprint")

_MAX_CANDIDATES = 60
_STRETCH_COUNT = 4
_DEFAULT_ESTIMATE_MINUTES = 60
_SPRINT_LABEL_PREFIX = "sprint:"
_SYSTEM = (
    "You are FounderOS, a local productivity copilot for a solo technical founder. "
    "Always respond with the exact JSON shape requested and nothing else."
)


def sprint_label(week_start: date) -> str:
    return f"{_SPRINT_LABEL_PREFIX}{week_start.isoformat()}"


def next_week_start(today: date) -> date:
    """The upcoming Monday (next week's, if today already is Monday)."""
    return today + timedelta(days=(7 - today.weekday()) % 7 or 7)


class SprintService:
    def __init__(
        self,
        tasks: TaskRepositoryProtocol,
        prefs: PrefsRepositoryProtocol,
        notes: NoteRepositoryProtocol,
        activity: ActivityRepositoryProtocol,
        planner_constants: PlannerConstants,
        provider: LLMProvider | None,
    ) -> None:
        self._tasks = tasks
        self._prefs = prefs
        self._notes = notes
        self._activity = activity
        self._planner = planner_constants
        self._provider = provider

    # Proposal -------------------------------------------------------------

    def propose(self, week_start: date | None = None) -> dict[str, Any]:
        start = week_start or next_week_start(utcnow().date())
        end = start + timedelta(days=4)
        prefs = self._prefs.get()
        capacity = int(prefs.available_hours * 60 * 5 * (1 - self._planner.buffer_ratio))

        candidates = self._candidates()
        proposal = None
        if self._provider is not None and self._provider.is_available():
            proposal = self._propose_ai(start, end, capacity, candidates)
        if proposal is None:
            proposal = self._propose_heuristic(capacity, candidates)

        selected, stretch, theme, summary, source = proposal
        planned = sum(self._estimate(t) for t in selected)
        return {
            "week_start": start,
            "week_end": end,
            "capacity_minutes": capacity,
            "planned_minutes": planned,
            "theme": theme,
            "summary": summary,
            "source": source,
            "tasks": [self._task_summary(t) for t in selected],
            "stretch": [self._task_summary(t) for t in stretch],
        }

    def _propose_ai(
        self, start: date, end: date, capacity: int, candidates: list[Task]
    ) -> tuple[list[Task], list[Task], str, str, str] | None:
        completed = self._tasks.completed_between(utcnow() - timedelta(days=7), utcnow())
        listing = "\n".join(
            f"- id={t.id} :: {t.title} [{t.task_type.value}, ~{self._estimate(t)}m, "
            f"score {t.priority_score:.0f}, status {t.status.value}]"
            for t in candidates
        )
        prompt = (PROMPTS_DIR / "sprint.md").read_text(encoding="utf-8").format(
            week_start=start.isoformat(),
            week_end=end.isoformat(),
            capacity_minutes=capacity,
            completed="\n".join(f"- {t.title}" for t in completed[:15]) or "(none)",
            candidates=listing or "(none)",
        )
        try:
            data = extract_json(
                self._provider.complete(  # type: ignore[union-attr]
                    CompletionRequest(prompt=prompt, system=_SYSTEM, json_mode=True)
                )
            )
        except LLMError as exc:
            logger.warning("AI sprint proposal failed (%s); using heuristic", exc)
            return None
        if not isinstance(data, dict):
            return None

        by_id = {t.id: t for t in candidates}
        selected: list[Task] = []
        used = 0
        for task_id in data.get("task_ids", []):
            task = by_id.get(str(task_id))
            if task is None or any(s.id == task.id for s in selected):
                continue
            estimate = self._estimate(task)
            if used + estimate > capacity:  # the model overshot — hard-enforce
                continue
            selected.append(task)
            used += estimate
        if not selected:
            return None
        stretch = [
            by_id[str(i)]
            for i in data.get("stretch_task_ids", [])
            if str(i) in by_id and all(s.id != str(i) for s in selected)
        ][:_STRETCH_COUNT]
        return (
            selected,
            stretch,
            str(data.get("theme", "")).strip(),
            str(data.get("summary", "")).strip(),
            "ai",
        )

    def _propose_heuristic(
        self, capacity: int, candidates: list[Task]
    ) -> tuple[list[Task], list[Task], str, str, str]:
        selected: list[Task] = []
        used = 0
        overflow: list[Task] = []
        for task in candidates:  # already sorted by priority score
            estimate = self._estimate(task)
            if used + estimate <= capacity:
                selected.append(task)
                used += estimate
            else:
                overflow.append(task)
        stretch = overflow[:_STRETCH_COUNT]
        summary = (
            f"Top {len(selected)} open tasks by priority score fill "
            f"{used // 60}h{used % 60:02d} of the {capacity // 60}h weekly capacity; "
            f"{len(overflow)} lower-priority tasks stay in the backlog."
        )
        return selected, stretch, "Highest-priority backlog first", summary, "heuristic"

    # Acceptance -----------------------------------------------------------

    def accept(self, week_start: date, task_ids: list[str]) -> dict[str, Any]:
        """Label the chosen tasks for the sprint, promote triage-stage ones to
        Ready, and record the sprint as a decision-log note."""
        label = sprint_label(week_start)
        updated: list[Task] = []
        for task_id in task_ids:
            task = self._tasks.get(task_id)
            if task is None:
                continue
            if label not in task.labels:
                task.labels = [*task.labels, label]  # fresh list: JSON column change tracking
            if task.status in (TaskStatus.INBOX, TaskStatus.BACKLOG):
                task.status = TaskStatus.READY
            task.updated_at = utcnow()
            updated.append(self._tasks.save(task))
        if not updated:
            raise KeyError("No matching tasks to accept")

        lines = "\n".join(
            f"- [ ] {t.title} (~{self._estimate(t)}m, score {t.priority_score:.0f})"
            for t in updated
        )
        total = sum(self._estimate(t) for t in updated)
        note = self._notes.add(
            Note(
                title=f"Sprint — week of {week_start.isoformat()}",
                kind=NoteKind.DECISION_LOG,
                content_md=(
                    f"## Sprint plan ({week_start.isoformat()})\n\n"
                    f"{len(updated)} tasks · ~{total // 60}h{total % 60:02d} planned\n\n{lines}\n"
                ),
                tags=["sprint"],
            )
        )
        self._activity.log(
            ActivityKind.SPRINT_ACCEPTED,
            payload={"week_start": week_start.isoformat(), "tasks": len(updated)},
        )
        logger.info("Sprint accepted for %s: %d tasks", week_start, len(updated))
        return {"week_start": week_start, "updated": len(updated), "note_id": note.id}

    # Internals ------------------------------------------------------------

    def _candidates(self) -> list[Task]:
        planable = (
            TaskStatus.INBOX,
            TaskStatus.BACKLOG,
            TaskStatus.READY,
            *TaskStatus.working_statuses(),
        )
        tasks = [t for t in self._tasks.list_all_open() if t.status in planable]
        tasks.sort(key=lambda t: -t.priority_score)
        return tasks[:_MAX_CANDIDATES]

    @staticmethod
    def _estimate(task: Task) -> int:
        return task.estimated_minutes or _DEFAULT_ESTIMATE_MINUTES

    def _task_summary(self, task: Task) -> dict[str, Any]:
        return {
            "id": task.id,
            "title": task.title,
            "task_type": task.task_type.value,
            "status": task.status.value,
            "project_id": task.project_id,
            "estimated_minutes": self._estimate(task),
            "priority_score": round(task.priority_score, 1),
            "deep_work": task.deep_work,
        }
