"""Application configuration.

All tunable values live here or in ``shared/constants.json`` — never hardcoded
at call sites. Environment variables (prefix ``FOUNDEROS_``) override defaults,
e.g. ``FOUNDEROS_DATABASE_URL`` or ``FOUNDEROS_LLM_PROVIDER``.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]
SHARED_CONSTANTS_PATH = REPO_ROOT / "shared" / "constants.json"
PROMPTS_DIR = REPO_ROOT / "prompts"
MODELS_DIR = REPO_ROOT / "models"
PLUGINS_DIR = REPO_ROOT / "plugins"
DATABASE_DIR = REPO_ROOT / "database"


class PlannerConstants(BaseModel):
    max_research_sessions: int = 2
    max_implementation_sessions: int = 2
    max_writing_sessions: int = 1
    max_review_sessions: int = 1
    break_interval_minutes: int = 90
    break_duration_minutes: int = 15
    buffer_ratio: float = 0.15
    context_switch_penalty_minutes: int = 10
    min_session_minutes: int = 25
    max_session_minutes: int = 120
    default_day_start: str = "09:00"
    default_available_hours: float = 8


class EstimationConstants(BaseModel):
    base_minutes_by_type: dict[str, int] = Field(default_factory=dict)
    complexity_multipliers: dict[str, float] = Field(default_factory=dict)
    optimistic_factor: float = 0.7
    pessimistic_factor: float = 1.8


class ScoringConstants(BaseModel):
    priority_weights: dict[str, float] = Field(default_factory=dict)
    knowledge_checklist_weights: dict[str, int] = Field(default_factory=dict)


class SharedConstants(BaseModel):
    """Typed view over ``shared/constants.json`` (shared with the frontend)."""

    task_statuses: list[str]
    working_statuses: list[str]
    task_types: list[str]
    priorities: list[str]
    energy_levels: list[str]
    risk_levels: list[str]
    project_statuses: list[str]
    planner: PlannerConstants
    estimation: EstimationConstants
    scoring: ScoringConstants


def _load_shared_constants(path: Path) -> SharedConstants:
    with path.open("r", encoding="utf-8") as fh:
        raw: dict[str, Any] = json.load(fh)
    return SharedConstants.model_validate(raw)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FOUNDEROS_", env_file=".env", extra="ignore")

    app_name: str = "FounderOS"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    database_url: str = f"sqlite:///{DATABASE_DIR / 'founderos.db'}"

    # LLM provider: "ollama", "openai" (any OpenAI-compatible server),
    # "anthropic" (Claude API), "claude-code" (the Claude Code CLI — runs on a
    # Claude subscription, no API credits), or "none" ("none" disables LLM
    # calls; deterministic heuristics are used instead).
    llm_provider: str = "ollama"
    llm_model: str = "qwen3"
    ollama_base_url: str = "http://127.0.0.1:11434"
    openai_base_url: str = "http://127.0.0.1:11434/v1"
    openai_api_key: str = "not-needed-for-local"
    anthropic_api_key: str = ""  # falls back to ANTHROPIC_API_KEY if empty
    anthropic_model: str = "claude-opus-4-8"
    # Claude Code CLI provider: binary must be logged in (`claude` -> /login).
    claude_code_binary: str = "claude"
    claude_code_model: str = "opus"  # alias or full model id; "" = CLI default
    # Where Claude Code stores per-project session transcripts; the workspace
    # scanner reads recent activity from here as a planning signal.
    claude_history_dir: str = "~/.claude/projects"
    llm_timeout_seconds: float = 120.0

    # Semantic search embeddings — independent of the completion provider,
    # since chat models like Opus (via CLI) can't embed. "auto" uses local
    # Ollama when reachable; search stays keyword-only otherwise.
    embedding_provider: str = "auto"  # auto | ollama | openai | none | plugin:...
    embedding_model: str = "nomic-embed-text"
    embedding_reindex_interval_minutes: int = 60

    # Background jobs
    scheduler_enabled: bool = True
    priority_recalc_interval_minutes: int = 30
    rollover_hour: int = 3  # local hour at which unfinished planned work rolls over

    # Morning compile automation: scans workspaces, derives tasks per board,
    # and builds the day plan. Time is local to `timezone` (default 06:00 IST).
    timezone: str = "Asia/Kolkata"
    morning_compile_enabled: bool = True
    morning_compile_time: str = "06:00"
    # Local repo paths to scan (one board each). Env: JSON list, e.g.
    # FOUNDEROS_WORKSPACES='["~/code/proj-a", "~/code/proj-b", "~/code/proj-c"]'
    workspaces: list[str] = []

    # File watching (markdown vault). Empty string disables watching.
    watch_directory: str = ""

    @property
    def constants(self) -> SharedConstants:
        return get_shared_constants()


@lru_cache
def get_shared_constants() -> SharedConstants:
    return _load_shared_constants(SHARED_CONSTANTS_PATH)


@lru_cache
def get_settings() -> Settings:
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    return Settings()
