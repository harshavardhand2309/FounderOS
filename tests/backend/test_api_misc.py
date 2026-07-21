"""API tests: projects (CRUD + overview + milestones/epics), planner, notes,
reading, search and prefs endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


def _utc_today():
    return datetime.now(timezone.utc).date()


def _create_project(client, **overrides) -> dict:
    payload = {"name": "Launch FounderOS"}
    payload.update(overrides)
    resp = client.post("/api/projects", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_task(client, **overrides) -> dict:
    payload = {"title": "Some task"}
    payload.update(overrides)
    resp = client.post("/api/tasks", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# Projects: CRUD -----------------------------------------------------------


def test_project_create_and_get_roundtrip(client) -> None:
    """POST /projects persists the payload and GET returns the same project."""
    project = _create_project(
        client,
        name="Rocket",
        description="Build it",
        goals=["orbit"],
        priority="high",
        deadline="2026-12-31",
    )
    assert project["name"] == "Rocket"
    assert project["description"] == "Build it"
    assert project["goals"] == ["orbit"]
    assert project["priority"] == "high"
    assert project["status"] == "active"
    assert project["deadline"] == "2026-12-31"

    got = client.get(f"/api/projects/{project['id']}")
    assert got.status_code == 200
    assert got.json() == project


def test_project_list_excludes_archived_by_default(client) -> None:
    """GET /projects hides archived projects unless include_archived=true."""
    active = _create_project(client, name="Active one")
    archived = _create_project(client, name="Old one", status="archived")

    default_ids = {p["id"] for p in client.get("/api/projects").json()}
    assert active["id"] in default_ids
    assert archived["id"] not in default_ids

    all_ids = {p["id"] for p in client.get("/api/projects?include_archived=true").json()}
    assert {active["id"], archived["id"]} <= all_ids


def test_project_update_and_delete(client) -> None:
    """PATCH updates only provided fields; DELETE removes and later access 404s."""
    project = _create_project(client, name="Before", description="keep me")

    patched = client.patch(f"/api/projects/{project['id']}", json={"name": "After"})
    assert patched.status_code == 200
    body = patched.json()
    assert body["name"] == "After"
    assert body["description"] == "keep me"  # untouched field survives

    assert client.patch("/api/projects/nope", json={"name": "X"}).status_code == 404

    assert client.delete(f"/api/projects/{project['id']}").status_code == 204
    assert client.get(f"/api/projects/{project['id']}").status_code == 404
    assert client.delete(f"/api/projects/{project['id']}").status_code == 404


# Projects: overview math --------------------------------------------------


def test_project_overview_math(client) -> None:
    """Overview: progress is estimate-weighted, counts split done/open/blocked,
    and remaining minutes sum estimate-minus-actual over open tasks."""
    project = _create_project(client, name="Math check")
    pid = project["id"]
    _create_task(client, title="Done work", project_id=pid, status="done", estimated_minutes=60)
    _create_task(client, title="Open work", project_id=pid, status="ready", estimated_minutes=120)
    _create_task(client, title="Stuck work", project_id=pid, status="blocked", estimated_minutes=30)

    resp = client.get(f"/api/projects/{pid}/overview")
    assert resp.status_code == 200
    o = resp.json()

    # progress = done_est / total_est = 60 / (60 + 120 + 30) -> 28.6 after round(., 1)
    assert o["progress_pct"] == 28.6
    assert o["total_tasks"] == 3
    assert o["done_tasks"] == 1
    assert o["open_tasks"] == 2  # blocked counts as open
    assert o["blocked_tasks"] == 1
    # remaining = (120 - 0) + (30 - 0) over the open tasks; done contributes 0
    assert o["estimated_remaining_minutes"] == 150
    # No work sessions logged -> zero burn rate -> no completion prediction
    assert o["completion_prediction"] is None
    assert o["project"]["id"] == pid

    overviews = client.get("/api/projects/overviews")
    assert overviews.status_code == 200
    assert [ov["project"]["id"] for ov in overviews.json()] == [pid]

    assert client.get("/api/projects/nope/overview").status_code == 404


# Projects: milestones & epics ---------------------------------------------


def test_milestone_crud_and_overview_counts(client) -> None:
    """Milestones support add/list/patch/delete; overview counts done ones."""
    project = _create_project(client, name="Milestoned")
    pid = project["id"]

    m1 = client.post(f"/api/projects/{pid}/milestones", json={"name": "Alpha", "sort_order": 0})
    m2 = client.post(f"/api/projects/{pid}/milestones", json={"name": "Beta", "sort_order": 1})
    assert m1.status_code == 201 and m2.status_code == 201
    assert m1.json()["project_id"] == pid
    assert m1.json()["completed_at"] is None

    assert client.post("/api/projects/nope/milestones", json={"name": "X"}).status_code == 404

    listed = client.get(f"/api/projects/{pid}/milestones").json()
    assert [m["name"] for m in listed] == ["Alpha", "Beta"]

    done = client.patch(
        f"/api/projects/milestones/{m1.json()['id']}",
        json={"completed_at": "2026-07-20T10:00:00Z"},
    )
    assert done.status_code == 200
    assert done.json()["completed_at"] is not None

    overview = client.get(f"/api/projects/{pid}/overview").json()
    assert overview["milestones_total"] == 2
    assert overview["milestones_done"] == 1

    assert client.delete(f"/api/projects/milestones/{m2.json()['id']}").status_code == 204
    assert client.delete(f"/api/projects/milestones/{m2.json()['id']}").status_code == 404
    assert len(client.get(f"/api/projects/{pid}/milestones").json()) == 1


def test_epic_crud(client) -> None:
    """Epics can be added to a project, listed, and deleted."""
    project = _create_project(client, name="Epic host")
    pid = project["id"]

    epic = client.post(f"/api/projects/{pid}/epics", json={"name": "Big theme"})
    assert epic.status_code == 201
    assert epic.json()["project_id"] == pid
    assert epic.json()["color"] == "#8b5cf6"

    assert client.post("/api/projects/nope/epics", json={"name": "X"}).status_code == 404

    listed = client.get(f"/api/projects/{pid}/epics").json()
    assert [e["id"] for e in listed] == [epic.json()["id"]]

    assert client.delete(f"/api/projects/epics/{epic.json()['id']}").status_code == 204
    assert client.delete(f"/api/projects/epics/{epic.json()['id']}").status_code == 404
    assert client.get(f"/api/projects/{pid}/epics").json() == []


def test_delete_project_detaches_tasks(client) -> None:
    """Deleting a project keeps its tasks but nulls their project_id."""
    project = _create_project(client, name="Doomed")
    task = _create_task(client, title="Survivor", project_id=project["id"])
    assert task["project_id"] == project["id"]

    assert client.delete(f"/api/projects/{project['id']}").status_code == 204

    got = client.get(f"/api/tasks/{task['id']}")
    assert got.status_code == 200  # task survives the project
    assert got.json()["project_id"] is None


# Planner ------------------------------------------------------------------


def test_planner_generate_returns_entries_and_buffer(client) -> None:
    """Generate packs ready tasks into focus entries and reserves a 15% buffer."""
    task = _create_task(client, title="Ship feature", status="ready", estimated_minutes=60)
    plan_date = _utc_today().isoformat()

    resp = client.post(
        "/api/planner/generate", json={"plan_date": plan_date, "available_minutes": 200}
    )
    assert resp.status_code == 200, resp.text
    plan = resp.json()
    assert plan["plan_date"] == plan_date
    assert plan["available_minutes"] == 200
    assert plan["buffer_minutes"] == 30  # round(200 * 0.15)

    focus = [e for e in plan["entries"] if e["kind"] == "focus"]
    buffers = [e for e in plan["entries"] if e["kind"] == "buffer"]
    assert len(focus) == 1
    assert focus[0]["task_id"] == task["id"]
    assert focus[0]["duration_minutes"] == 60
    assert focus[0]["start_minute"] == 9 * 60  # default day_start 09:00
    assert focus[0]["status"] == "planned"
    assert len(buffers) == 1
    assert buffers[0]["duration_minutes"] == 30


def test_planner_regenerate_replaces_plan_and_keeps_done_entries(client) -> None:
    """Regenerating the same date replaces the plan; done entries carry over."""
    task = _create_task(client, title="Carry me", status="ready", estimated_minutes=60)
    plan_date = _utc_today().isoformat()

    first = client.post(
        "/api/planner/generate", json={"plan_date": plan_date, "available_minutes": 200}
    ).json()
    focus_id = next(e["id"] for e in first["entries"] if e["kind"] == "focus")
    assert client.patch(f"/api/planner/entries/{focus_id}", json={"status": "done"}).status_code == 200

    second = client.post(
        "/api/planner/generate", json={"plan_date": plan_date, "available_minutes": 100}
    ).json()
    assert second["id"] != first["id"]  # old plan replaced by a new one
    assert second["available_minutes"] == 100

    # The completed entry survived the replan, and its task was not re-planned.
    focus = [e for e in second["entries"] if e["kind"] == "focus"]
    assert len(focus) == 1
    assert focus[0]["task_id"] == task["id"]
    assert focus[0]["status"] == "done"

    by_date = client.get(f"/api/planner/{plan_date}")
    assert by_date.status_code == 200
    assert by_date.json()["id"] == second["id"]


def test_planner_entry_patch_status_and_locked(client) -> None:
    """PATCH /planner/entries updates status and locked; unknown entry 404s."""
    _create_task(client, title="Patch target", status="ready", estimated_minutes=60)
    plan = client.post(
        "/api/planner/generate",
        json={"plan_date": _utc_today().isoformat(), "available_minutes": 200},
    ).json()
    entry = next(e for e in plan["entries"] if e["kind"] == "focus")
    assert entry["status"] == "planned" and entry["locked"] is False

    resp = client.patch(
        f"/api/planner/entries/{entry['id']}", json={"status": "done", "locked": True}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "done"
    assert body["locked"] is True

    assert client.patch("/api/planner/entries/nope", json={"status": "done"}).status_code == 404


def test_planner_rollover_marks_past_unfinished_entries_moved(client) -> None:
    """Rollover flags yesterday's unfinished focus entries as moved; breaks and
    buffer are untouched, and a second rollover is a no-op."""
    _create_task(client, title="Unfinished", status="ready", estimated_minutes=60)
    yesterday = (_utc_today() - timedelta(days=1)).isoformat()
    plan = client.post(
        "/api/planner/generate", json={"plan_date": yesterday, "available_minutes": 200}
    ).json()
    assert any(e["kind"] == "focus" and e["status"] == "planned" for e in plan["entries"])

    resp = client.post("/api/planner/rollover")
    assert resp.status_code == 200
    assert resp.json() == {"moved": 1}

    refreshed = client.get(f"/api/planner/{yesterday}").json()
    focus = [e for e in refreshed["entries"] if e["kind"] == "focus"]
    assert all(e["status"] == "moved" for e in focus)
    buffers = [e for e in refreshed["entries"] if e["kind"] == "buffer"]
    assert all(e["status"] == "planned" for e in buffers)

    assert client.post("/api/planner/rollover").json() == {"moved": 0}


def test_planner_today_endpoint(client) -> None:
    """GET /planner/today is null before generation and the plan afterwards."""
    empty = client.get("/api/planner/today")
    assert empty.status_code == 200
    assert empty.json() is None

    generated = client.post("/api/planner/generate", json={})
    assert generated.status_code == 200
    assert generated.json()["plan_date"] == _utc_today().isoformat()

    today = client.get("/api/planner/today")
    assert today.status_code == 200
    assert today.json()["id"] == generated.json()["id"]


# Notes --------------------------------------------------------------------


def test_note_crud(client) -> None:
    """Notes support create/get/list/patch/delete with 404 on missing ids."""
    created = client.post(
        "/api/notes",
        json={"title": "Design notes", "kind": "technical", "content_md": "# Hi", "tags": ["arch"]},
    )
    assert created.status_code == 201
    note = created.json()
    assert note["title"] == "Design notes"
    assert note["kind"] == "technical"
    assert note["content_md"] == "# Hi"
    assert note["tags"] == ["arch"]

    got = client.get(f"/api/notes/{note['id']}")
    assert got.status_code == 200
    assert got.json()["id"] == note["id"]
    assert note["id"] in {n["id"] for n in client.get("/api/notes").json()}

    patched = client.patch(f"/api/notes/{note['id']}", json={"content_md": "updated"})
    assert patched.status_code == 200
    assert patched.json()["content_md"] == "updated"
    assert patched.json()["title"] == "Design notes"

    assert client.patch("/api/notes/nope", json={"title": "X"}).status_code == 404
    assert client.delete(f"/api/notes/{note['id']}").status_code == 204
    assert client.get(f"/api/notes/{note['id']}").status_code == 404
    assert client.delete(f"/api/notes/{note['id']}").status_code == 404


def test_note_tag_filter(client) -> None:
    """GET /notes?tag= returns only notes carrying that exact tag."""
    ml = client.post("/api/notes", json={"title": "ML note", "tags": ["ml", "papers"]}).json()
    infra = client.post("/api/notes", json={"title": "Infra note", "tags": ["infra"]}).json()
    client.post("/api/notes", json={"title": "Untagged note"})

    filtered = client.get("/api/notes", params={"tag": "ml"}).json()
    assert [n["id"] for n in filtered] == [ml["id"]]

    infra_hits = client.get("/api/notes", params={"tag": "infra"}).json()
    assert [n["id"] for n in infra_hits] == [infra["id"]]

    assert client.get("/api/notes", params={"tag": "nothing"}).json() == []


# Reading ------------------------------------------------------------------


def test_reading_crud(client) -> None:
    """Reading items support create/get/list/patch/delete with sane defaults."""
    created = client.post("/api/reading", json={"title": "Attention Is All You Need", "kind": "paper"})
    assert created.status_code == 201
    item = created.json()
    assert item["status"] == "queued"
    assert item["progress_pct"] == 0
    assert item["review_interval_days"] == 7
    assert item["next_review_at"] is None

    assert client.get(f"/api/reading/{item['id']}").json()["id"] == item["id"]
    assert item["id"] in {i["id"] for i in client.get("/api/reading").json()}
    queued = client.get("/api/reading", params={"item_status": "queued"}).json()
    assert item["id"] in {i["id"] for i in queued}
    assert client.get("/api/reading", params={"item_status": "completed"}).json() == []

    patched = client.patch(f"/api/reading/{item['id']}", json={"author": "Vaswani et al."})
    assert patched.status_code == 200
    assert patched.json()["author"] == "Vaswani et al."

    assert client.patch("/api/reading/nope", json={"author": "X"}).status_code == 404
    assert client.delete(f"/api/reading/{item['id']}").status_code == 204
    assert client.get(f"/api/reading/{item['id']}").status_code == 404
    assert client.delete(f"/api/reading/{item['id']}").status_code == 404


def test_reading_completed_sets_progress_and_schedules_review(client) -> None:
    """Moving an item to completed forces progress to 100, stamps completed_at,
    and schedules the first review one interval (7 days) out."""
    item = client.post("/api/reading", json={"title": "Deep Work"}).json()

    resp = client.patch(f"/api/reading/{item['id']}", json={"status": "completed"})
    assert resp.status_code == 200
    done = resp.json()
    assert done["status"] == "completed"
    assert done["progress_pct"] == 100
    assert done["completed_at"] is not None
    assert done["next_review_at"] == (_utc_today() + timedelta(days=7)).isoformat()


def test_reading_complete_review_grows_interval(client) -> None:
    """Each completed review doubles the interval, capped at 120 days."""
    item = client.post("/api/reading", json={"title": "SICP"}).json()
    client.patch(f"/api/reading/{item['id']}", json={"status": "completed"})

    first = client.post(f"/api/reading/{item['id']}/complete-review")
    assert first.status_code == 200
    assert first.json()["review_interval_days"] == 14
    assert first.json()["next_review_at"] == (_utc_today() + timedelta(days=14)).isoformat()

    second = client.post(f"/api/reading/{item['id']}/complete-review")
    assert second.json()["review_interval_days"] == 28

    client.patch(f"/api/reading/{item['id']}", json={"review_interval_days": 100})
    capped = client.post(f"/api/reading/{item['id']}/complete-review")
    assert capped.json()["review_interval_days"] == 120  # 200 hits the cap

    assert client.post("/api/reading/nope/complete-review").status_code == 404


def test_reading_due_reviews_lists_only_due_completed_items(client) -> None:
    """/reading/due-reviews returns completed items whose review date passed."""
    due = client.post("/api/reading", json={"title": "Due item"}).json()
    client.patch(f"/api/reading/{due['id']}", json={"status": "completed"})
    yesterday = (_utc_today() - timedelta(days=1)).isoformat()
    client.patch(f"/api/reading/{due['id']}", json={"next_review_at": yesterday})

    not_due = client.post("/api/reading", json={"title": "Future item"}).json()
    client.patch(f"/api/reading/{not_due['id']}", json={"status": "completed"})  # review in +7d

    client.post("/api/reading", json={"title": "Still queued"})

    resp = client.get("/api/reading/due-reviews")
    assert resp.status_code == 200
    assert [i["id"] for i in resp.json()] == [due["id"]]


# Search -------------------------------------------------------------------


def test_search_ranks_title_prefix_above_title_and_body_matches(client) -> None:
    """Search returns task+project+note hits with title-prefix hits scoring
    above title matches, which score above body-only matches."""
    task = _create_task(client, title="Rocket engine design", description="turbo pumps")
    project = _create_project(client, name="Alpha rocket program", description="fly high")
    note = client.post(
        "/api/notes",
        json={"title": "Meeting minutes", "content_md": "The rocket launch slipped a week."},
    ).json()

    resp = client.get("/api/search", params={"q": "rocket"})
    assert resp.status_code == 200
    hits = resp.json()
    assert [(h["kind"], h["id"]) for h in hits] == [
        ("task", task["id"]),  # title prefix: strongest
        ("project", project["id"]),  # title (non-prefix) match
        ("note", note["id"]),  # body-only match: weakest
    ]
    scores = [h["score"] for h in hits]
    assert scores == sorted(scores, reverse=True)
    assert hits[0]["score"] > hits[1]["score"] > hits[2]["score"]
    assert "rocket" in hits[2]["snippet"].lower()  # snippet drawn from the body

    assert client.get("/api/search").status_code == 422  # q is required


# Prefs --------------------------------------------------------------------


def test_prefs_get_put_roundtrip(client) -> None:
    """Prefs start at documented defaults, and PUT updates persist across GETs
    while leaving unspecified fields untouched."""
    initial = client.get("/api/prefs")
    assert initial.status_code == 200
    prefs = initial.json()
    assert prefs["available_hours"] == 8.0
    assert prefs["day_start"] == "09:00"
    assert prefs["deep_work_block_minutes"] == 90
    assert prefs["week_start_monday"] is True
    assert prefs["theme"] == "dark"
    assert prefs["llm_enabled"] is True

    updated = client.put("/api/prefs", json={"theme": "light", "available_hours": 6.5})
    assert updated.status_code == 200
    assert updated.json()["theme"] == "light"
    assert updated.json()["available_hours"] == 6.5
    assert updated.json()["day_start"] == "09:00"  # untouched field survives

    again = client.get("/api/prefs").json()
    assert again["theme"] == "light"
    assert again["available_hours"] == 6.5

    assert client.put("/api/prefs", json={"day_start": "9:00"}).status_code == 422
    assert client.put("/api/prefs", json={"bogus_field": 1}).status_code == 422
