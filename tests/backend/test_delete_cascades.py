"""Regression tests: deletes must survive SQLite FK enforcement.

Every edge (work sessions, notes, reading items, plan entries, epics) either
cascades or detaches — a delete must never 500 on an IntegrityError.
"""

from __future__ import annotations


def _mk_task(client, **overrides):
    payload = {"title": "Task under test", "status": "ready", **overrides}
    response = client.post("/api/tasks", json=payload)
    assert response.status_code == 201
    return response.json()


def test_delete_task_with_work_sessions_notes_reading_and_plan(client) -> None:
    """A task woven into everything (sessions, note, reading, day plan) deletes cleanly."""
    task = _mk_task(client)
    assert client.post(f"/api/tasks/{task['id']}/work", json={"minutes": 30}).status_code == 200
    note = client.post(
        "/api/notes", json={"title": "Linked note", "task_id": task["id"]}
    ).json()
    reading = client.post(
        "/api/reading", json={"title": "Linked paper", "task_id": task["id"]}
    ).json()
    plan = client.post("/api/planner/generate", json={"available_minutes": 240}).json()
    assert any(e["task_id"] == task["id"] for e in plan["entries"]), "task should be planned"

    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204

    # Artifacts survive, detached.
    assert client.get(f"/api/notes/{note['id']}").json()["task_id"] is None
    assert client.get(f"/api/reading/{reading['id']}").json()["task_id"] is None
    refreshed = client.get("/api/planner/today").json()
    assert all(e["task_id"] != task["id"] for e in refreshed["entries"])


def test_delete_project_with_epics_notes_and_reading(client) -> None:
    """Project deletion detaches tasks (incl. epic refs), notes and reading items."""
    project = client.post("/api/projects", json={"name": "Doomed project"}).json()
    epic = client.post(
        f"/api/projects/{project['id']}/epics", json={"name": "Epic 1"}
    ).json()
    task = _mk_task(client, project_id=project["id"], epic_id=epic["id"])
    note = client.post(
        "/api/notes", json={"title": "Project note", "project_id": project["id"]}
    ).json()
    reading = client.post(
        "/api/reading", json={"title": "Project paper", "project_id": project["id"]}
    ).json()

    assert client.delete(f"/api/projects/{project['id']}").status_code == 204

    survivor = client.get(f"/api/tasks/{task['id']}").json()
    assert survivor["project_id"] is None
    assert survivor["epic_id"] is None
    assert client.get(f"/api/notes/{note['id']}").json()["project_id"] is None
    assert client.get(f"/api/reading/{reading['id']}").json()["project_id"] is None


def test_delete_note_referenced_by_reading_item(client) -> None:
    """Reading items drop their note link when the note is deleted."""
    note = client.post("/api/notes", json={"title": "Paper summary"}).json()
    reading = client.post("/api/reading", json={"title": "The paper"}).json()
    client.patch(f"/api/reading/{reading['id']}", json={"note_id": note["id"]})

    assert client.delete(f"/api/notes/{note['id']}").status_code == 204
    assert client.get(f"/api/reading/{reading['id']}").json()["note_id"] is None
