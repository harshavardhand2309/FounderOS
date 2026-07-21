"""Automation tests: morning compile, document intake, ICS export, and the
Anthropic provider's request shape (Opus 4.8 rejects sampling params)."""

from __future__ import annotations

import datetime
import json
import os
import subprocess
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.core.config import get_settings


@pytest.fixture()
def workspace(tmp_path: Path):
    """A tiny git repo with a TODO marker and a dirty file, wired into settings."""
    repo = tmp_path / "demo-project"
    repo.mkdir()
    (repo / "main.py").write_text("# TODO: add input validation\nprint('hi')\n")
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    subprocess.run(["git", "-C", str(repo), "add", "-A"], check=True)
    subprocess.run(
        ["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "init"],
        check=True,
    )
    (repo / "wip.md").write_text("draft\n")

    os.environ["FOUNDEROS_WORKSPACES"] = json.dumps([str(repo)])
    os.environ["FOUNDEROS_LLM_PROVIDER"] = "none"
    get_settings.cache_clear()
    yield repo
    os.environ.pop("FOUNDEROS_WORKSPACES", None)
    os.environ.pop("FOUNDEROS_LLM_PROVIDER", None)
    get_settings.cache_clear()


def test_morning_compile_creates_board_and_tasks(workspace, client) -> None:
    """Compile auto-creates a project per workspace and derives ready tasks."""
    report = client.post("/api/automation/compile").json()
    assert report["tasks_created"] > 0
    assert report["workspaces"][0]["workspace"] == "demo-project"
    assert report["workspaces"][0]["source"] == "heuristic"
    assert report["plan_entries"] > 0

    projects = client.get("/api/projects").json()
    assert any(p["name"] == "demo-project" for p in projects)

    board = client.get("/api/tasks/board").json()
    ready = next(c for c in board["columns"] if c["status"] == "ready")
    assert all(t["estimated_minutes"] for t in ready["tasks"])
    assert any("morning-compile" in t["labels"] for t in ready["tasks"])


def test_morning_compile_is_idempotent_for_duplicates(workspace, client) -> None:
    """Running compile twice must not duplicate the same derived tasks."""
    first = client.post("/api/automation/compile").json()
    second = client.post("/api/automation/compile").json()
    assert first["tasks_created"] > 0
    assert second["tasks_created"] == 0
    assert second["workspaces"][0]["skipped_duplicates"] >= first["tasks_created"]


def test_document_intake_creates_estimate_task_note_and_reading(client) -> None:
    """Pasted text yields a study task with a word-count-scaled estimate."""
    text = "Vector databases store embeddings for similarity search. " * 250  # ~2000 words
    result = client.post(
        "/api/automation/intake/document",
        data={"text": text, "title": "Vector DB docs", "instruction": "study and review"},
    ).json()

    assert result["source"] == "heuristic"
    assert result["reading_minutes"] >= 5
    assert result["estimated_minutes"] > result["reading_minutes"]

    task = client.get(f"/api/tasks/{result['task_id']}").json()
    assert task["task_type"] == "reading"
    assert task["status"] == "ready"
    assert task["estimated_minutes"] == result["estimated_minutes"]
    assert "intake" in task["labels"]

    note = client.get(f"/api/notes/{result['note_id']}").json()
    assert note["task_id"] == result["task_id"]
    reading_items = client.get("/api/reading").json()
    assert any(r["id"] == result["reading_item_id"] for r in reading_items)


def test_intake_rejects_empty_payload(client) -> None:
    assert client.post("/api/automation/intake/document", data={"text": "  "}).status_code == 422


def test_plan_ics_export(client) -> None:
    """The day plan exports as iCalendar with timezone-anchored events."""
    client.post("/api/tasks", json={"title": "Deep task", "status": "ready", "deep_work": True})
    client.post("/api/planner/generate", json={"available_minutes": 240})
    today = datetime.date.today().isoformat()

    response = client.get(f"/api/planner/{today}/calendar.ics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/calendar")
    body = response.text
    assert "BEGIN:VCALENDAR" in body and "END:VCALENDAR" in body
    assert body.count("BEGIN:VEVENT") >= 2  # at least one focus block + buffer
    assert "DTSTART;TZID=" in body

    missing = client.get("/api/planner/1999-01-01/calendar.ics")
    assert missing.status_code == 404


def test_anthropic_provider_request_shape() -> None:
    """Opus 4.8 rejects temperature/top_p and thinking budgets — the provider
    must send adaptive thinking and no sampling params."""
    from app.infrastructure.llm.anthropic_provider import AnthropicProvider
    from app.infrastructure.llm.base import CompletionRequest

    provider = AnthropicProvider(api_key="test-key", model="claude-opus-4-8", timeout_seconds=5)
    captured: dict = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(
            stop_reason="end_turn",
            content=[SimpleNamespace(type="text", text='{"ok": true}')],
        )

    provider._client.messages.create = fake_create  # type: ignore[method-assign]
    text = provider.complete(
        CompletionRequest(prompt="hello", system="sys", json_mode=True, temperature=0.9)
    )

    assert text == '{"ok": true}'
    assert captured["model"] == "claude-opus-4-8"
    assert captured["thinking"] == {"type": "adaptive"}
    assert "temperature" not in captured and "top_p" not in captured
    assert captured["max_tokens"] >= 4096
    assert provider.is_available() is True
