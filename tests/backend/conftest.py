"""Shared fixtures: each test gets a fresh SQLite database and app client."""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest

# Must be set before any app import touches settings.
os.environ.setdefault("FOUNDEROS_SCHEDULER_ENABLED", "false")

from app.core.config import get_settings  # noqa: E402
from app.infrastructure.db import create_db_and_tables, reset_engine_for_tests  # noqa: E402


@pytest.fixture()
def fresh_db(tmp_path: Path) -> Iterator[None]:
    """Point the app at a brand-new database file."""
    db_path = tmp_path / "test.db"
    os.environ["FOUNDEROS_DATABASE_URL"] = f"sqlite:///{db_path}"
    get_settings.cache_clear()
    reset_engine_for_tests()
    create_db_and_tables()
    yield
    reset_engine_for_tests()
    os.environ.pop("FOUNDEROS_DATABASE_URL", None)
    get_settings.cache_clear()


@pytest.fixture()
def client(fresh_db: None) -> Iterator["TestClient"]:  # noqa: F821
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def session(fresh_db: None) -> Iterator["Session"]:  # noqa: F821
    from sqlmodel import Session

    from app.infrastructure.db import get_engine

    with Session(get_engine()) as s:
        yield s
