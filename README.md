# FounderOS

**A local-first AI operating system for founders running multiple research-heavy projects.**

Not another Kanban board: FounderOS organizes projects, estimates and prioritizes work,
generates your daily schedule, detects blocked tasks, tracks how deeply you actually
*learned* things, and continuously reschedules unfinished work — so you never have to
ask *"what should I do next?"*

- **Local-first** — everything works offline; data lives in a local SQLite file.
- **Single-user, no auth, no cloud.**
- **AI-assisted** — local Ollama (`qwen3`) by default; any OpenAI-compatible API
  pluggable; deterministic heuristics keep every feature working with no model at all.

## What it does

| Module | Highlights |
| --- | --- |
| **Projects** | goals, milestones, epics, priority, progress %, knowledge progress %, estimated remaining hours, predicted completion date |
| **Kanban** | 11-stage flow (Inbox → … → Done/Archived), drag & drop, priority scores on every card, blocked-task surfacing |
| **My Day** | tell it your available hours; it builds the schedule: max 2 research + 2 implementation + 1 writing + 1 review sessions, a break every 90 minutes, 15% buffer, context-switch penalties, deep-work blocks, a learning slot — excess work defers automatically |
| **AI planner** | task estimation (optimistic/realistic/pessimistic + confidence, corrected by your historical bias), 0–100 priority scoring, dependency-aware auto-block/unblock with cycle refusal, AI subtask breakdown, daily/weekly reviews, risk analysis, knowledge quizzes, duplicate detection |
| **Knowledge system** | TipTap notes (research, summaries, paper reviews, ADRs, decision logs), linked to tasks/projects, plus an Obsidian-style watched markdown vault |
| **Learning engine** | per-task learning checklist (docs → paper → summarize → explain → compare → implement) scored 0–100 — completion alone never equals knowledge; reading tracker with understanding/implementation scores and spaced revision reminders |
| **Dashboard** | today's plan, velocity, burndown, focus distribution, learning heatmap, project health and completion predictions, overload warnings |
| **Search** | instant global search (⌘K) across tasks, projects, notes and reading |

## Quick start

```bash
# Backend (Python 3.11+, uv recommended)
cd backend
uv venv .venv && uv pip install -e ".[dev]"
.venv/bin/python -m app.main            # http://127.0.0.1:8000 (API docs at /api/docs)

# Frontend (Node 20+)
cd frontend
npm install
npm run dev                             # http://localhost:5173 (proxies /api)

# Optional: local AI
ollama pull qwen3                       # that's it — FounderOS finds it at :11434
```

Run the tests:

```bash
cd backend && .venv/bin/python -m pytest ../tests/backend   # 157 tests
cd frontend && npm run build                                # strict TS + build
```

## Configuration

Everything is env-driven with the `FOUNDEROS_` prefix (see `backend/app/core/config.py`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `FOUNDEROS_LLM_PROVIDER` | `ollama` | `ollama` \| `openai` \| `none` \| `plugin:module:Class` |
| `FOUNDEROS_LLM_MODEL` | `qwen3` | model name for the chosen provider |
| `FOUNDEROS_OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | local Ollama |
| `FOUNDEROS_OPENAI_BASE_URL` | — | any OpenAI-compatible server |
| `FOUNDEROS_WATCH_DIRECTORY` | *(off)* | markdown vault to mirror into Notes |
| `FOUNDEROS_SCHEDULER_ENABLED` | `true` | background priority recalc + nightly rollover |

Planner rules, estimation bases and scoring weights live in `shared/constants.json`
— shared verbatim by backend and frontend.

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React + TypeScript + Vite + Tailwind + shadcn-style UI |
| `backend/` | FastAPI + SQLModel, clean architecture (see docs/ARCHITECTURE.md) |
| `shared/` | constants shared by both sides |
| `database/` | local SQLite data (gitignored) |
| `plugins/` | LLM provider plugins (+ working example) |
| `prompts/` | editable prompt templates for all AI features |
| `models/` | model registry / known-good local options |
| `tests/` | backend test suite |
| `docs/` | architecture guide + ADRs |

## Keyboard shortcuts

- `⌘K` / `Ctrl+K` — command palette (navigation, actions, global search)
- `C` — new task
- Dark mode by default; toggle in the sidebar.

## Roadmap

- Embedding-based semantic search (the keyword search service already exposes the
  plug point; needs an embedding-capable provider).
- Sprint generation UI (the AI weekly review already proposes next-week priorities).
- Task file/link attachments UI (already in the data model and API).
- Multi-device sync layer (see ADR 0002 — local SQLite stays the source of truth).
