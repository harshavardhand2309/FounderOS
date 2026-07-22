"""Sprint generation: capacity-checked proposals and the accept flow."""

from __future__ import annotations

import datetime
import json
import os

import pytest

from app.core.config import get_settings


@pytest.fixture()
def no_llm():
    os.environ["FOUNDEROS_LLM_PROVIDER"] = "none"
    get_settings.cache_clear()
    yield
    os.environ.pop("FOUNDEROS_LLM_PROVIDER", None)
    get_settings.cache_clear()


def _seed_tasks(client, count: int = 6, minutes: int = 480) -> list[dict]:
    tasks = []
    for i in range(count):
        tasks.append(
            client.post(
                "/api/tasks",
                json={
                    "title": f"Backlog item {i}",
                    "status": "backlog",
                    "estimated_minutes": minutes,
                    "importance": 5 - (i % 3),
                },
            ).json()
        )
    return tasks


def test_sprint_proposal_respects_weekly_capacity(no_llm, client) -> None:
    """8h/day × 5 days − 15% buffer = 2040m capacity → only 4 of 6 480m tasks fit."""
    _seed_tasks(client, count=6, minutes=480)
    proposal = client.post("/api/planner/sprint/propose", json={}).json()

    assert proposal["source"] == "heuristic"
    assert proposal["capacity_minutes"] == 2040
    assert proposal["planned_minutes"] <= proposal["capacity_minutes"]
    assert len(proposal["tasks"]) == 4
    assert proposal["stretch"], "overflow tasks become stretch candidates"
    assert proposal["summary"]

    # Selection follows priority order (highest score first).
    scores = [t["priority_score"] for t in proposal["tasks"]]
    assert scores == sorted(scores, reverse=True)

    # Defaults to next Monday.
    week_start = datetime.date.fromisoformat(proposal["week_start"])
    assert week_start.weekday() == 0
    assert week_start > datetime.date.today()


def test_sprint_accept_labels_promotes_and_logs(no_llm, client) -> None:
    _seed_tasks(client, count=3, minutes=120)
    proposal = client.post("/api/planner/sprint/propose", json={}).json()
    ids = [t["id"] for t in proposal["tasks"]]

    result = client.post(
        "/api/planner/sprint/accept",
        json={"week_start": proposal["week_start"], "task_ids": ids},
    ).json()
    assert result["updated"] == len(ids)

    label = f"sprint:{proposal['week_start']}"
    for task_id in ids:
        task = client.get(f"/api/tasks/{task_id}").json()
        assert label in task["labels"]
        assert task["status"] == "ready"  # promoted from backlog

    note = client.get(f"/api/notes/{result['note_id']}").json()
    assert note["kind"] == "decision_log"
    assert "Sprint plan" in note["content_md"]
    assert all("Backlog item" in note["content_md"] for _ in ids)

    # Accepting unknown ids is a 404, not a silent no-op.
    missing = client.post(
        "/api/planner/sprint/accept",
        json={"week_start": proposal["week_start"], "task_ids": ["nope"]},
    )
    assert missing.status_code == 404


def test_sprint_ai_path_enforces_capacity_and_valid_ids(client, session, no_llm) -> None:
    """The model may hallucinate ids or overshoot capacity — the service must clamp."""
    from app.application.services.sprint_service import SprintService
    from app.core.config import get_shared_constants
    from app.infrastructure.llm.base import CompletionRequest, LLMProvider
    from app.infrastructure.repositories import (
        ActivityRepository,
        NoteRepository,
        PrefsRepository,
        TaskRepository,
    )

    tasks = _seed_tasks(client, count=3, minutes=1200)  # 3 × 20h > 34h capacity

    class FakeProvider(LLMProvider):
        name = "fake"

        def complete(self, request: CompletionRequest) -> str:
            return json.dumps(
                {
                    "theme": "Ship auth",
                    "summary": "Focus week.",
                    "task_ids": [t["id"] for t in tasks] + ["hallucinated-id"],
                    "stretch_task_ids": ["also-fake"],
                }
            )

        def is_available(self) -> bool:
            return True

    service = SprintService(
        tasks=TaskRepository(session),
        prefs=PrefsRepository(session),
        notes=NoteRepository(session),
        activity=ActivityRepository(session),
        planner_constants=get_shared_constants().planner,
        provider=FakeProvider(),
    )
    proposal = service.propose()
    assert proposal["source"] == "ai"
    assert proposal["theme"] == "Ship auth"
    assert proposal["planned_minutes"] <= proposal["capacity_minutes"]
    assert len(proposal["tasks"]) == 1  # only one 1200m task fits in 2040m
    returned_ids = {t["id"] for t in proposal["tasks"] + proposal["stretch"]}
    assert "hallucinated-id" not in returned_ids and "also-fake" not in returned_ids
