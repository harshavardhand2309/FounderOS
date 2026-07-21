"""Tests for the day-planning engine (pure, no DB needed).

Covers buffer reservation, break insertion, session caps, context-switch
penalties and project stickiness, overload protection, learning slots,
timeline integrity, deep-work sessions, and degenerate inputs.
"""

from __future__ import annotations

from app.application.engines.planner import PlannableTask, PlannerEngine
from app.core.config import get_shared_constants
from app.domain.enums import PlanEntryKind, TaskType

PLANNER = get_shared_constants().planner
DAY_START = 540  # 09:00


def make_task(
    task_id: str,
    task_type: TaskType = TaskType.CODING,
    score: float = 50.0,
    minutes: int = 60,
    project: str | None = "proj-a",
    deep: bool = False,
) -> PlannableTask:
    return PlannableTask(
        id=task_id,
        title=task_id,
        project_id=project,
        task_type=task_type,
        priority_score=score,
        remaining_minutes=minutes,
        deep_work=deep,
    )


def build(candidates, available=480, start=DAY_START, learning=False):
    return PlannerEngine(PLANNER).build_day(
        candidates,
        available_minutes=available,
        day_start_minute=start,
        include_learning_slot=learning,
    )


def focus_entries(result):
    return [e for e in result.entries if e.kind == PlanEntryKind.FOCUS]


def entries_of(result, kind):
    return [e for e in result.entries if e.kind == kind]


# --- shared constants sanity ------------------------------------------------


def test_planner_constants_match_shared_json():
    """The planner constants the tests rely on are pinned in shared/constants.json."""
    assert PLANNER.buffer_ratio == 0.15
    assert PLANNER.break_interval_minutes == 90
    assert PLANNER.break_duration_minutes == 15
    assert PLANNER.context_switch_penalty_minutes == 10
    assert PLANNER.min_session_minutes == 25
    assert PLANNER.max_session_minutes == 120
    assert PLANNER.max_research_sessions == 2
    assert PLANNER.max_implementation_sessions == 2
    assert PLANNER.max_writing_sessions == 1
    assert PLANNER.max_review_sessions == 1


# --- buffer reservation -----------------------------------------------------


def test_buffer_entry_reserves_15_percent():
    """15% of available minutes is always set aside as a trailing buffer entry."""
    result = build([make_task("t1", minutes=60)], available=480)
    buffers = entries_of(result, PlanEntryKind.BUFFER)
    assert len(buffers) == 1
    assert buffers[0].duration_minutes == 72  # round(480 * 0.15)
    assert result.buffer_minutes == 72
    assert result.entries[-1].kind == PlanEntryKind.BUFFER


def test_work_fits_within_budget_after_buffer():
    """Work, breaks, and penalties together never eat into the 15% buffer."""
    tasks = [
        make_task("t1", TaskType.CODING, 100, 120),
        make_task("t2", TaskType.RESEARCH, 90, 120),
        make_task("t3", TaskType.WRITING, 80, 120),
        make_task("t4", TaskType.REVIEW, 70, 120),
    ]
    result = build(tasks, available=480)
    budget = 480 - result.buffer_minutes
    consumed = result.work_minutes + result.break_minutes + result.switch_penalty_minutes
    assert result.buffer_minutes == 72
    assert consumed <= budget


# --- break insertion --------------------------------------------------------


def test_break_inserted_so_focus_runs_stay_within_interval():
    """With short sessions, no run of consecutive focus work exceeds 90 minutes."""
    types = [
        TaskType.RESEARCH,
        TaskType.READING,
        TaskType.CODING,
        TaskType.PLANNING,
        TaskType.WRITING,
        TaskType.REVIEW,
    ]
    tasks = [
        make_task(f"t{i}", tt, score=100 - i, minutes=45) for i, tt in enumerate(types)
    ]
    result = build(tasks, available=480)
    assert len(entries_of(result, PlanEntryKind.BREAK)) == 2
    run = 0
    for entry in result.entries:
        if entry.kind == PlanEntryKind.FOCUS:
            run += entry.duration_minutes
            assert run <= PLANNER.break_interval_minutes
        else:
            run = 0


def test_break_separates_long_session_from_next():
    """After a session that exhausts the break interval, a break precedes more work."""
    tasks = [
        make_task("deep", TaskType.CODING, 100, 120, deep=True),
        make_task("next", TaskType.RESEARCH, 90, 60),
    ]
    result = build(tasks, available=480)
    kinds = [e.kind for e in result.entries]
    assert kinds[:3] == [PlanEntryKind.FOCUS, PlanEntryKind.BREAK, PlanEntryKind.FOCUS]
    assert result.break_minutes == PLANNER.break_duration_minutes


# --- session caps -----------------------------------------------------------


def test_research_cap_counts_reading_sessions():
    """Reading shares the research cap: at most 2 research+reading sessions per day."""
    tasks = [
        make_task("r1", TaskType.RESEARCH, 100, 60),
        make_task("r2", TaskType.READING, 90, 60),
        make_task("r3", TaskType.RESEARCH, 80, 60),
    ]
    result = build(tasks, available=480)
    assert len(focus_entries(result)) == 2
    assert result.unplanned_task_ids == ["r3"]


def test_implementation_cap_spans_coding_planning_admin():
    """Coding, planning, and admin share the 2-session implementation cap."""
    tasks = [
        make_task("c1", TaskType.CODING, 100, 60),
        make_task("p1", TaskType.PLANNING, 90, 60),
        make_task("a1", TaskType.ADMIN, 80, 60),
    ]
    result = build(tasks, available=480)
    assert len(focus_entries(result)) == 2
    assert result.unplanned_task_ids == ["a1"]


def test_writing_cap_is_one_session():
    """Only one writing session is planned per day."""
    tasks = [
        make_task("w1", TaskType.WRITING, 100, 60),
        make_task("w2", TaskType.WRITING, 90, 60),
    ]
    result = build(tasks, available=480)
    sessions = focus_entries(result)
    assert len(sessions) == 1
    assert sessions[0].task_id == "w1"
    assert result.unplanned_task_ids == ["w2"]


def test_review_cap_is_one_session():
    """Only one review session is planned per day."""
    tasks = [
        make_task("v1", TaskType.REVIEW, 100, 45),
        make_task("v2", TaskType.REVIEW, 90, 45),
    ]
    result = build(tasks, available=480)
    assert len(focus_entries(result)) == 1
    assert result.unplanned_task_ids == ["v2"]


# --- context switching & stickiness -----------------------------------------


def test_context_switch_penalty_consumed_between_projects():
    """Hopping projects costs the 10-minute penalty, visible as a timeline gap."""
    tasks = [
        make_task("t1", TaskType.CODING, 100, 60, project="proj-a"),
        make_task("t2", TaskType.RESEARCH, 80, 60, project="proj-b"),
    ]
    result = build(tasks, available=480)
    assert result.switch_penalty_minutes == PLANNER.context_switch_penalty_minutes
    sessions = focus_entries(result)
    breaks = entries_of(result, PlanEntryKind.BREAK)
    # break ends at 615; the second session starts 10 penalty minutes later.
    assert breaks[0].start_minute + breaks[0].duration_minutes == 615
    assert sessions[1].start_minute == 625


def test_stickiness_prefers_same_project_within_score_window():
    """A same-project task within 15 points is planned before a higher-scored switch."""
    tasks = [
        make_task("t1", TaskType.CODING, 100, 60, project="proj-a"),
        make_task("t2", TaskType.RESEARCH, 95, 60, project="proj-b"),
        make_task("t3", TaskType.RESEARCH, 90, 60, project="proj-a"),
    ]
    result = build(tasks, available=480)
    assert [e.task_id for e in focus_entries(result)] == ["t1", "t3", "t2"]
    assert result.switch_penalty_minutes == PLANNER.context_switch_penalty_minutes


def test_stickiness_ignored_outside_score_window():
    """A same-project task more than 15 points behind does not jump the queue."""
    tasks = [
        make_task("t1", TaskType.CODING, 100, 60, project="proj-a"),
        make_task("t2", TaskType.RESEARCH, 95, 60, project="proj-b"),
        make_task("t3", TaskType.RESEARCH, 79, 60, project="proj-a"),
    ]
    result = build(tasks, available=480)
    assert [e.task_id for e in focus_entries(result)] == ["t1", "t2", "t3"]
    assert result.switch_penalty_minutes == 2 * PLANNER.context_switch_penalty_minutes


# --- overload protection & unplanned reporting ------------------------------


def test_day_never_overloaded_and_excess_reported():
    """Entry durations never exceed available minutes; unscheduled tasks are reported."""
    tasks = [
        make_task("t1", TaskType.CODING, 100, 120),
        make_task("t2", TaskType.RESEARCH, 90, 120),
        make_task("t3", TaskType.WRITING, 80, 120),
        make_task("t4", TaskType.REVIEW, 70, 120),
    ]
    result = build(tasks, available=240)
    assert sum(e.duration_minutes for e in result.entries) <= 240
    assert result.unplanned_task_ids == ["t3", "t4"]
    scheduled = {e.task_id for e in focus_entries(result)}
    assert scheduled.isdisjoint(result.unplanned_task_ids)


def test_closing_session_squeezed_into_leftover_budget():
    """A final shorter session (>= 25 min) is squeezed in rather than wasted."""
    result = build([make_task("t1", TaskType.CODING, 100, 120)], available=100)
    sessions = focus_entries(result)
    assert len(sessions) == 1
    assert sessions[0].duration_minutes == 85  # budget 85 after 15-minute buffer
    assert sum(e.duration_minutes for e in result.entries) <= 100
    # Partially planned task is not reported as unplanned.
    assert result.unplanned_task_ids == []


# --- learning slot ----------------------------------------------------------


def test_learning_slot_added_when_budget_allows():
    """include_learning_slot yields a 45-minute learning entry when budget permits."""
    result = build([make_task("t1", TaskType.CODING, 100, 60)], available=480, learning=True)
    learning = entries_of(result, PlanEntryKind.LEARNING)
    assert len(learning) == 1
    assert learning[0].duration_minutes == 45
    assert result.work_minutes == 60 + 45


def test_learning_slot_skipped_when_budget_tight():
    """The learning slot is dropped when it would not fit inside the budget."""
    result = build([make_task("t1", TaskType.CODING, 100, 60)], available=100, learning=True)
    assert entries_of(result, PlanEntryKind.LEARNING) == []


# --- timeline integrity -----------------------------------------------------


def test_entries_contiguous_from_day_start_without_switches():
    """With one project, entries start at day_start and tile back-to-back."""
    tasks = [
        make_task("t1", TaskType.CODING, 100, 60),
        make_task("t2", TaskType.RESEARCH, 90, 60),
        make_task("t3", TaskType.WRITING, 80, 60),
    ]
    result = build(tasks, available=480)
    assert result.entries[0].start_minute == DAY_START
    for prev, nxt in zip(result.entries, result.entries[1:]):
        assert nxt.start_minute == prev.start_minute + prev.duration_minutes


def test_entries_never_overlap_even_with_penalty_gaps():
    """Across project switches, entries stay ordered and never overlap."""
    tasks = [
        make_task("t1", TaskType.CODING, 100, 60, project="proj-a"),
        make_task("t2", TaskType.RESEARCH, 95, 60, project="proj-b"),
        make_task("t3", TaskType.RESEARCH, 79, 60, project="proj-a"),
    ]
    result = build(tasks, available=480)
    assert result.entries[0].start_minute == DAY_START
    for prev, nxt in zip(result.entries, result.entries[1:]):
        assert nxt.start_minute >= prev.start_minute + prev.duration_minutes


# --- deep work --------------------------------------------------------------


def test_deep_work_task_gets_long_session_and_priority_tiebreak():
    """At equal score the deep-work task goes first and gets a max-length session."""
    tasks = [
        make_task("shallow", TaskType.RESEARCH, 50, 60),
        make_task("deep", TaskType.CODING, 50, 240, deep=True),
    ]
    result = build(tasks, available=480)
    first = focus_entries(result)[0]
    assert first.task_id == "deep"
    assert first.duration_minutes == PLANNER.max_session_minutes
    assert first.duration_minutes >= PLANNER.break_interval_minutes
    assert first.title.startswith("Deep work")


# --- degenerate inputs ------------------------------------------------------


def test_empty_candidates_yield_only_buffer():
    """No candidates: the plan is just the buffer entry, no crash."""
    result = build([], available=480)
    assert [e.kind for e in result.entries] == [PlanEntryKind.BUFFER]
    assert result.unplanned_task_ids == []
    assert result.work_minutes == 0


def test_empty_candidates_and_zero_available_yield_nothing():
    """Zero available minutes with no candidates produces an empty plan."""
    result = build([], available=0)
    assert result.entries == []
    assert result.work_minutes == 0
    assert result.buffer_minutes == 0


def test_tiny_available_minutes_does_not_crash_or_overflow():
    """A sliver of a day plans no work, keeps its tiny buffer, and reports the task."""
    result = build([make_task("t1", TaskType.CODING, 100, 60)], available=10)
    assert focus_entries(result) == []
    assert result.unplanned_task_ids == ["t1"]
    assert result.buffer_minutes == 2  # round(10 * 0.15)
    assert sum(e.duration_minutes for e in result.entries) <= 10
