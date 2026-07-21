"""Day planning engine.

Packs prioritized tasks into a realistic day: session caps per work category,
a break every ~90 minutes, a 15% buffer reserve, a context-switch penalty
whenever the plan hops projects, and a learning slot when reading is in
flight. Excess work is reported as unplanned — a day is never overloaded.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.core.config import PlannerConstants
from app.domain.enums import PlanEntryKind, TaskType

# Work categories share session caps (see shared/constants.json).
_CATEGORY_BY_TYPE: dict[TaskType, str] = {
    TaskType.RESEARCH: "research",
    TaskType.READING: "research",
    TaskType.CODING: "implementation",
    TaskType.PLANNING: "implementation",
    TaskType.ADMIN: "implementation",
    TaskType.WRITING: "writing",
    TaskType.REVIEW: "review",
}

_LEARNING_SLOT_MINUTES = 45
# A same-project task within this score distance is preferred over switching.
_STICKINESS_SCORE_WINDOW = 15.0


@dataclass(frozen=True)
class PlannableTask:
    id: str
    title: str
    project_id: str | None
    task_type: TaskType
    priority_score: float
    remaining_minutes: int
    deep_work: bool = False


@dataclass(frozen=True)
class EntrySpec:
    kind: PlanEntryKind
    title: str
    start_minute: int
    duration_minutes: int
    task_id: str | None = None
    session_type: TaskType | None = None


@dataclass(frozen=True)
class PlanResult:
    entries: list[EntrySpec]
    unplanned_task_ids: list[str]
    work_minutes: int
    break_minutes: int
    buffer_minutes: int
    switch_penalty_minutes: int


@dataclass
class _State:
    cursor: int  # minutes from midnight
    used: int = 0  # wall-clock minutes consumed (work + breaks + penalties)
    since_break: int = 0
    work: int = 0
    breaks: int = 0
    penalties: int = 0
    sessions_by_category: dict[str, int] = field(default_factory=dict)
    entries: list[EntrySpec] = field(default_factory=list)
    last_project_id: str | None = None
    had_focus: bool = False


class PlannerEngine:
    def __init__(self, constants: PlannerConstants) -> None:
        self._c = constants

    def build_day(
        self,
        candidates: list[PlannableTask],
        available_minutes: int,
        day_start_minute: int,
        include_learning_slot: bool = False,
    ) -> PlanResult:
        c = self._c
        buffer_minutes = int(round(available_minutes * c.buffer_ratio))
        budget = max(0, available_minutes - buffer_minutes)

        caps = {
            "research": c.max_research_sessions,
            "implementation": c.max_implementation_sessions,
            "writing": c.max_writing_sessions,
            "review": c.max_review_sessions,
        }

        state = _State(cursor=day_start_minute)
        remaining = {t.id: t.remaining_minutes for t in candidates}
        # Deep-work first within equal footing: sort by score, deep work breaking ties.
        pool = sorted(candidates, key=lambda t: (-t.priority_score, not t.deep_work, t.id))
        planned_ids: set[str] = set()

        learning_pending = include_learning_slot

        while True:
            task = self._pick_next(pool, remaining, caps, state)
            if task is None:
                break

            session_len = self._session_length(remaining[task.id], task.deep_work)
            switch_penalty = self._switch_penalty(state, task)
            break_needed = state.since_break + session_len > c.break_interval_minutes and state.had_focus

            cost = session_len + switch_penalty + (c.break_duration_minutes if break_needed else 0)
            if state.used + cost > budget:
                # Try to squeeze a shorter closing session in before giving up.
                leftover = budget - state.used - switch_penalty - (
                    c.break_duration_minutes if break_needed else 0
                )
                if leftover >= c.min_session_minutes:
                    session_len = min(session_len, leftover)
                else:
                    break

            if break_needed:
                self._add_break(state)
            if switch_penalty:
                state.used += switch_penalty
                state.cursor += switch_penalty
                state.penalties += switch_penalty

            self._add_focus(state, task, session_len)
            remaining[task.id] -= session_len
            planned_ids.add(task.id)

            if learning_pending and state.breaks >= 1:
                learning_pending = not self._try_add_learning(state, budget)

        if learning_pending:
            self._try_add_learning(state, budget)

        if buffer_minutes > 0:
            state.entries.append(
                EntrySpec(
                    kind=PlanEntryKind.BUFFER,
                    title="Buffer — overflow & unexpected work",
                    start_minute=state.cursor,
                    duration_minutes=buffer_minutes,
                )
            )

        unplanned = [t.id for t in pool if remaining[t.id] > 0 and t.id not in planned_ids]
        return PlanResult(
            entries=state.entries,
            unplanned_task_ids=unplanned,
            work_minutes=state.work,
            break_minutes=state.breaks * c.break_duration_minutes,
            buffer_minutes=buffer_minutes,
            switch_penalty_minutes=state.penalties,
        )

    def _pick_next(
        self,
        pool: list[PlannableTask],
        remaining: dict[str, int],
        caps: dict[str, int],
        state: _State,
    ) -> PlannableTask | None:
        eligible = [
            t
            for t in pool
            if remaining[t.id] >= min(self._c.min_session_minutes, t.remaining_minutes)
            and remaining[t.id] > 0
            and state.sessions_by_category.get(_CATEGORY_BY_TYPE[t.task_type], 0)
            < caps[_CATEGORY_BY_TYPE[t.task_type]]
        ]
        if not eligible:
            return None
        best = eligible[0]
        if state.last_project_id is not None:
            # Stickiness: stay on the current project when a near-peer exists,
            # trading a few points of score for zero context-switch cost.
            for t in eligible:
                if (
                    t.project_id == state.last_project_id
                    and best.priority_score - t.priority_score <= _STICKINESS_SCORE_WINDOW
                ):
                    return t
        return best

    def _session_length(self, remaining_minutes: int, deep_work: bool) -> int:
        """Deep work runs uninterrupted up to max_session_minutes; regular work
        is capped at the break interval so no shallow session outlasts it."""
        c = self._c
        cap = c.max_session_minutes if deep_work else min(c.max_session_minutes, c.break_interval_minutes)
        length = min(remaining_minutes, cap)
        return max(c.min_session_minutes, length) if remaining_minutes >= c.min_session_minutes else remaining_minutes

    def _switch_penalty(self, state: _State, task: PlannableTask) -> int:
        if not state.had_focus or state.last_project_id == task.project_id:
            return 0
        return self._c.context_switch_penalty_minutes

    def _add_focus(self, state: _State, task: PlannableTask, minutes: int) -> None:
        category = _CATEGORY_BY_TYPE[task.task_type]
        label = "Deep work" if task.deep_work else category.capitalize()
        state.entries.append(
            EntrySpec(
                kind=PlanEntryKind.FOCUS,
                title=f"{label}: {task.title}",
                start_minute=state.cursor,
                duration_minutes=minutes,
                task_id=task.id,
                session_type=task.task_type,
            )
        )
        state.cursor += minutes
        state.used += minutes
        state.work += minutes
        state.since_break += minutes
        state.sessions_by_category[category] = state.sessions_by_category.get(category, 0) + 1
        state.last_project_id = task.project_id
        state.had_focus = True

    def _add_break(self, state: _State) -> None:
        c = self._c
        state.entries.append(
            EntrySpec(
                kind=PlanEntryKind.BREAK,
                title="Break — step away from the screen",
                start_minute=state.cursor,
                duration_minutes=c.break_duration_minutes,
            )
        )
        state.cursor += c.break_duration_minutes
        state.used += c.break_duration_minutes
        state.breaks += 1
        state.since_break = 0

    def _try_add_learning(self, state: _State, budget: int) -> bool:
        if state.used + _LEARNING_SLOT_MINUTES > budget:
            return False
        state.entries.append(
            EntrySpec(
                kind=PlanEntryKind.LEARNING,
                title="Learning — reading queue",
                start_minute=state.cursor,
                duration_minutes=_LEARNING_SLOT_MINUTES,
            )
        )
        state.cursor += _LEARNING_SLOT_MINUTES
        state.used += _LEARNING_SLOT_MINUTES
        state.work += _LEARNING_SLOT_MINUTES
        state.since_break += _LEARNING_SLOT_MINUTES
        return True
