"""API tests for /api/tasks: CRUD, estimation, board, dependencies,
checklist, work logging, completion side-effects, recurrence, subtasks."""

from __future__ import annotations

BASE = "/api/tasks"

# All 11 kanban statuses, in canonical enum order (mirrors shared/constants.json).
ALL_STATUSES = [
    "inbox",
    "backlog",
    "ready",
    "research",
    "reading",
    "coding",
    "writing",
    "review",
    "blocked",
    "done",
    "archived",
]


def _create(client, **overrides) -> dict:
    payload = {"title": "Task"}
    payload.update(overrides)
    response = client.post(BASE, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


# Create ---------------------------------------------------------------------


def test_create_returns_201_with_auto_estimate(client) -> None:
    """Creating a task without estimated_minutes auto-populates a heuristic
    estimate with optimistic < realistic < pessimistic."""
    task = _create(client, title="Build API")
    assert task["estimated_minutes"] is not None
    assert task["estimate_optimistic"] is not None
    assert task["estimate_pessimistic"] is not None
    assert (
        task["estimate_optimistic"]
        < task["estimated_minutes"]
        < task["estimate_pessimistic"]
    )
    assert task["estimate_source"] == "heuristic"


def test_create_default_coding_estimate_matches_constants(client) -> None:
    """Defaults (coding, complexity 3, difficulty 3) yield the base 150 minutes
    from shared/constants.json with 0.7/1.8 optimistic/pessimistic factors."""
    task = _create(client, title="Default estimate")
    assert task["estimated_minutes"] == 150
    assert task["estimate_optimistic"] == 105  # 150 * 0.7
    assert task["estimate_pessimistic"] == 270  # 150 * 1.8


def test_create_sets_priority_score(client) -> None:
    """A freshly created task gets a non-zero engine-computed priority_score."""
    task = _create(client, title="Scored")
    assert task["priority_score"] > 0


def test_create_with_manual_estimate_keeps_it(client) -> None:
    """Providing estimated_minutes on create skips auto-estimation."""
    task = _create(client, title="Manual", estimated_minutes=42)
    assert task["estimated_minutes"] == 42


# Get / patch / delete -------------------------------------------------------


def test_get_missing_task_returns_404(client) -> None:
    """GET of an unknown task id returns 404."""
    response = client.get(f"{BASE}/no-such-id")
    assert response.status_code == 404


def test_patch_partial_update_only_changes_given_fields(client) -> None:
    """PATCH is partial: fields not in the payload are untouched."""
    task = _create(client, title="Original", description="keep me", importance=4)
    response = client.patch(f"{BASE}/{task['id']}", json={"title": "Renamed"})
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Renamed"
    assert updated["description"] == "keep me"
    assert updated["importance"] == 4


def test_patch_missing_task_returns_404(client) -> None:
    """PATCH of an unknown task id returns 404."""
    response = client.patch(f"{BASE}/nope", json={"title": "x"})
    assert response.status_code == 404


def test_patch_manual_estimate_sets_source_manual(client) -> None:
    """Manually setting estimated_minutes flips estimate_source to manual and
    clears the derived optimistic/pessimistic bounds."""
    task = _create(client, title="Estimate me")
    response = client.patch(f"{BASE}/{task['id']}", json={"estimated_minutes": 42})
    assert response.status_code == 200
    updated = response.json()
    assert updated["estimated_minutes"] == 42
    assert updated["estimate_source"] == "manual"
    assert updated["estimate_optimistic"] is None
    assert updated["estimate_pessimistic"] is None


def test_patch_complexity_reestimates_non_manual_task(client) -> None:
    """Changing complexity on a heuristic-estimated task recomputes the
    estimate (coding base 150 * complexity-5 multiplier 2.25 = 340 rounded)."""
    task = _create(client, title="Reestimate")
    assert task["estimated_minutes"] == 150
    response = client.patch(f"{BASE}/{task['id']}", json={"complexity": 5})
    assert response.status_code == 200
    updated = response.json()
    assert updated["estimated_minutes"] == 340
    assert updated["estimate_source"] == "heuristic"
    assert (
        updated["estimate_optimistic"]
        < updated["estimated_minutes"]
        < updated["estimate_pessimistic"]
    )


def test_patch_complexity_does_not_reestimate_manual_task(client) -> None:
    """A manual estimate survives changes to estimate inputs like complexity."""
    task = _create(client, title="Manual stays")
    client.patch(f"{BASE}/{task['id']}", json={"estimated_minutes": 42})
    response = client.patch(f"{BASE}/{task['id']}", json={"complexity": 5})
    assert response.status_code == 200
    updated = response.json()
    assert updated["estimated_minutes"] == 42
    assert updated["estimate_source"] == "manual"


def test_delete_returns_204_then_404(client) -> None:
    """DELETE returns 204; the task is gone afterwards and re-delete 404s."""
    task = _create(client, title="Doomed")
    response = client.delete(f"{BASE}/{task['id']}")
    assert response.status_code == 204
    assert client.get(f"{BASE}/{task['id']}").status_code == 404
    assert client.delete(f"{BASE}/{task['id']}").status_code == 404


# Move & board ---------------------------------------------------------------


def test_move_changes_status_and_sequence(client) -> None:
    """Move sets the target column, appending after existing tasks by default;
    an explicit before_sequence places the task at that exact position."""
    occupant = _create(client, title="Already coding", status="coding")
    task = _create(client, title="Mover")
    assert task["status"] == "inbox"

    response = client.post(f"{BASE}/{task['id']}/move", json={"status": "coding"})
    assert response.status_code == 200
    moved = response.json()
    assert moved["status"] == "coding"
    assert moved["sequence"] > occupant["sequence"]  # appended at column end

    response = client.post(
        f"{BASE}/{task['id']}/move",
        json={"status": "coding", "before_sequence": 0.5},
    )
    assert response.status_code == 200
    assert response.json()["sequence"] == 0.5


def test_move_missing_task_returns_404(client) -> None:
    """Move of an unknown task id returns 404."""
    response = client.post(f"{BASE}/nope/move", json={"status": "ready"})
    assert response.status_code == 404


def test_board_groups_all_eleven_statuses(client) -> None:
    """The board always exposes one column per status (all 11, in canonical
    order) and files each task under its own status."""
    inbox_task = _create(client, title="In inbox")
    coding_task = _create(client, title="Being coded", status="coding")
    done_task = _create(client, title="Finished", status="done")

    response = client.get(f"{BASE}/board")
    assert response.status_code == 200
    columns = response.json()["columns"]
    assert [c["status"] for c in columns] == ALL_STATUSES

    by_status = {c["status"]: {t["id"] for t in c["tasks"]} for c in columns}
    assert inbox_task["id"] in by_status["inbox"]
    assert coding_task["id"] in by_status["coding"]
    assert done_task["id"] in by_status["done"]


# Dependencies ---------------------------------------------------------------


def test_add_dependency_auto_blocks_dependent(client) -> None:
    """Adding an unmet dependency to a READY task auto-moves it to BLOCKED
    with a 'Waiting on:' reason naming the prerequisite."""
    prereq = _create(client, title="Prerequisite", status="ready")
    dependent = _create(client, title="Dependent", status="ready")

    response = client.post(
        f"{BASE}/{dependent['id']}/dependencies",
        json={"depends_on_id": prereq["id"]},
    )
    assert response.status_code == 201
    dep = response.json()
    assert dep["task_id"] == dependent["id"]
    assert dep["depends_on_id"] == prereq["id"]

    refreshed = client.get(f"{BASE}/{dependent['id']}").json()
    assert refreshed["status"] == "blocked"
    assert refreshed["blocked_reason"].startswith("Waiting on:")
    assert "Prerequisite" in refreshed["blocked_reason"]


def test_add_dependency_cycle_returns_422(client) -> None:
    """An edge that would close a dependency loop is rejected with 422."""
    a = _create(client, title="A", status="ready")
    b = _create(client, title="B", status="ready")
    assert (
        client.post(
            f"{BASE}/{a['id']}/dependencies", json={"depends_on_id": b["id"]}
        ).status_code
        == 201
    )
    response = client.post(
        f"{BASE}/{b['id']}/dependencies", json={"depends_on_id": a["id"]}
    )
    assert response.status_code == 422


def test_add_self_dependency_returns_422(client) -> None:
    """A task depending on itself is a trivial cycle and is rejected."""
    a = _create(client, title="Selfish")
    response = client.post(
        f"{BASE}/{a['id']}/dependencies", json={"depends_on_id": a["id"]}
    )
    assert response.status_code == 422


def test_add_duplicate_dependency_returns_409(client) -> None:
    """Adding the same dependency edge twice returns 409."""
    a = _create(client, title="A")
    b = _create(client, title="B")
    first = client.post(f"{BASE}/{a['id']}/dependencies", json={"depends_on_id": b["id"]})
    assert first.status_code == 201
    second = client.post(f"{BASE}/{a['id']}/dependencies", json={"depends_on_id": b["id"]})
    assert second.status_code == 409


def test_add_dependency_missing_task_returns_404(client) -> None:
    """Both endpoints of a dependency must exist."""
    a = _create(client, title="A")
    response = client.post(
        f"{BASE}/{a['id']}/dependencies", json={"depends_on_id": "ghost"}
    )
    assert response.status_code == 404


def test_completing_prerequisite_auto_unblocks_dependent(client) -> None:
    """When the prerequisite is completed, an auto-blocked dependent returns
    to READY and its blocked_reason is cleared."""
    prereq = _create(client, title="Prerequisite", status="ready")
    dependent = _create(client, title="Dependent", status="ready")
    client.post(
        f"{BASE}/{dependent['id']}/dependencies",
        json={"depends_on_id": prereq["id"]},
    )
    assert client.get(f"{BASE}/{dependent['id']}").json()["status"] == "blocked"

    response = client.patch(f"{BASE}/{prereq['id']}", json={"status": "done"})
    assert response.status_code == 200

    refreshed = client.get(f"{BASE}/{dependent['id']}").json()
    assert refreshed["status"] == "ready"
    assert refreshed["blocked_reason"] is None


def test_dependencies_listed_in_task_detail(client) -> None:
    """Task detail includes its dependency edges."""
    a = _create(client, title="A")
    b = _create(client, title="B")
    client.post(f"{BASE}/{a['id']}/dependencies", json={"depends_on_id": b["id"]})
    detail = client.get(f"{BASE}/{a['id']}").json()
    assert [d["depends_on_id"] for d in detail["dependencies"]] == [b["id"]]


# Checklist ------------------------------------------------------------------


def test_checklist_patch_updates_learning_score(client) -> None:
    """Checking checklist items recomputes task.learning_score from the
    constants weights (read_docs 10 + summarized 20 = 30 of 100)."""
    task = _create(client, title="Learn things", task_type="research")
    response = client.patch(
        f"{BASE}/{task['id']}/checklist",
        json={"read_docs": True, "summarized": True},
    )
    assert response.status_code == 200
    checklist = response.json()
    assert checklist["read_docs"] is True
    assert checklist["summarized"] is True
    assert checklist["read_paper"] is False

    refreshed = client.get(f"{BASE}/{task['id']}").json()
    assert refreshed["learning_score"] == 30.0


def test_checklist_full_completion_scores_100(client) -> None:
    """All checklist items checked yields a learning_score of 100."""
    task = _create(client, title="Master it", task_type="reading")
    flags = {
        "read_docs": True,
        "read_paper": True,
        "summarized": True,
        "explained_own_words": True,
        "compared_alternatives": True,
        "implemented": True,
    }
    response = client.patch(f"{BASE}/{task['id']}/checklist", json=flags)
    assert response.status_code == 200
    assert client.get(f"{BASE}/{task['id']}").json()["learning_score"] == 100.0


# Work logging & completion --------------------------------------------------


def test_work_log_increments_actual_minutes(client) -> None:
    """Each work log adds its minutes to the task's actual_minutes."""
    task = _create(client, title="Grind")
    assert task["actual_minutes"] == 0

    response = client.post(f"{BASE}/{task['id']}/work", json={"minutes": 30})
    assert response.status_code == 200
    assert response.json()["actual_minutes"] == 30

    response = client.post(f"{BASE}/{task['id']}/work", json={"minutes": 45})
    assert response.status_code == 200
    assert response.json()["actual_minutes"] == 75


def test_status_done_sets_completed_at_and_falls_back_to_estimate(client) -> None:
    """Completing a task with no logged sessions stamps completed_at and
    assumes actual_minutes = estimated_minutes so history stays useful."""
    task = _create(client, title="Finish me")
    assert task["completed_at"] is None
    assert task["actual_minutes"] == 0

    response = client.patch(f"{BASE}/{task['id']}", json={"status": "done"})
    assert response.status_code == 200
    done = response.json()
    assert done["status"] == "done"
    assert done["completed_at"] is not None
    assert done["actual_minutes"] == done["estimated_minutes"]


def test_status_done_keeps_logged_actual_minutes(client) -> None:
    """When sessions were logged, completion keeps the real actual_minutes
    rather than overwriting them with the estimate."""
    task = _create(client, title="Tracked work")
    client.post(f"{BASE}/{task['id']}/work", json={"minutes": 25})
    done = client.patch(f"{BASE}/{task['id']}", json={"status": "done"}).json()
    assert done["actual_minutes"] == 25
    assert done["completed_at"] is not None


# Recurrence -----------------------------------------------------------------


def test_weekly_recurrence_spawns_backlog_clone_on_completion(client) -> None:
    """Completing a task with recurrence 'weekly' spawns a fresh clone in the
    backlog carrying the title and recurrence, with a future deadline."""
    task = _create(client, title="Weekly report", recurrence="weekly")
    response = client.patch(f"{BASE}/{task['id']}", json={"status": "done"})
    assert response.status_code == 200

    backlog = client.get(BASE, params={"status": "backlog"}).json()
    clones = [t for t in backlog if t["title"] == "Weekly report"]
    assert len(clones) == 1
    clone = clones[0]
    assert clone["id"] != task["id"]
    assert clone["status"] == "backlog"
    assert clone["recurrence"] == "weekly"
    assert clone["completed_at"] is None
    assert clone["deadline"] is not None


def test_non_recurring_completion_spawns_nothing(client) -> None:
    """Completing a task without recurrence does not create a clone."""
    task = _create(client, title="One-off")
    client.patch(f"{BASE}/{task['id']}", json={"status": "done"})
    backlog = client.get(BASE, params={"status": "backlog"}).json()
    assert [t for t in backlog if t["title"] == "One-off"] == []


# Subtasks -------------------------------------------------------------------


def test_subtask_appears_in_parent_detail(client) -> None:
    """A task created with parent_id shows up in the parent's detail subtasks."""
    parent = _create(client, title="Parent")
    child = _create(client, title="Child", parent_id=parent["id"])

    detail = client.get(f"{BASE}/{parent['id']}").json()
    subtask_ids = [t["id"] for t in detail["subtasks"]]
    assert child["id"] in subtask_ids
    assert all(t["parent_id"] == parent["id"] for t in detail["subtasks"])
