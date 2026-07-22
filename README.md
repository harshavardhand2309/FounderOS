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

## Morning compile (multi-workspace automation)

Point FounderOS at your coding workspaces and it compiles your day **every
morning at 06:00 IST** (configurable): rolls unfinished work forward, scans each
workspace (recent commits, uncommitted changes, TODO/FIXME markers), asks the
configured model — e.g. **Claude Opus 4.8** — to derive concrete tasks (testing,
bug fixes, docs to read/review, development) onto that workspace's **own board**
with time estimates, dedupes against existing work, recalculates priorities, and
builds your day timeline. Export it to your real calendar via
`GET /api/planner/{date}/calendar.ics` (button on My Day).

**Pick the brain that fits your budget** (all features work on every option):

```bash
# Option A — Claude subscription (Pro/Max), no API credits needed:
# routes through the Claude Code CLI in headless mode. Install the CLI,
# run `claude` once and /login, then:
export FOUNDEROS_LLM_PROVIDER=claude-code
export FOUNDEROS_CLAUDE_CODE_MODEL=opus          # alias or full model id

# Option B — Claude API (pay-as-you-go credits):
export FOUNDEROS_LLM_PROVIDER=anthropic          # Opus 4.8 via the Claude API
export ANTHROPIC_API_KEY=sk-ant-...

# Option C — free local model (default):
export FOUNDEROS_LLM_PROVIDER=ollama             # qwen3 via local Ollama
```

**Registering your coding sessions as workspaces** — either from the UI
(Settings → Morning compile → *Add*, which creates the board and runs an
initial scan immediately) or via env:

```bash
export FOUNDEROS_WORKSPACES='["~/code/session-a", "~/code/session-b", "~/code/session-c"]'
export FOUNDEROS_TIMEZONE="Asia/Kolkata"         # default
export FOUNDEROS_MORNING_COMPILE_TIME="06:00"    # default
```

If your sessions are Claude Code **cloud** sessions, clone each session's repo
locally and check out its working branch — the scanner reads the local
checkout, so a `git pull` (cron it if you like) keeps the morning compile in
sync with what the sessions pushed.

Run the compile on demand with `POST /api/automation/compile` (or the button in
Settings → Morning compile). Without a reachable model it degrades to
deterministic heuristics, so the pipeline never breaks.

**Ad-hoc document intake:** upload or paste a doc ("these are the docs we need
to study and review") via Learning → *Intake document* (or
`POST /api/automation/intake/document`). FounderOS parses it (.pdf/.md/.txt),
estimates study time (reading + summarizing, AI-refined by density), and creates
a note, a reading-queue entry, and a ready-to-schedule task — so you can decide
when to place it, or let the next plan generation slot it by priority.

## Configuration

Everything is env-driven with the `FOUNDEROS_` prefix (see `backend/app/core/config.py`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `FOUNDEROS_LLM_PROVIDER` | `ollama` | `ollama` \| `openai` \| `anthropic` \| `claude-code` \| `none` \| `plugin:module:Class` |
| `FOUNDEROS_LLM_MODEL` | `qwen3` | model for ollama/openai providers |
| `FOUNDEROS_ANTHROPIC_MODEL` | `claude-opus-4-8` | model for the anthropic provider |
| `FOUNDEROS_ANTHROPIC_API_KEY` | — | falls back to `ANTHROPIC_API_KEY` |
| `FOUNDEROS_CLAUDE_CODE_MODEL` | `opus` | model alias/id for the claude-code provider |
| `FOUNDEROS_CLAUDE_CODE_BINARY` | `claude` | path to the Claude Code CLI |
| `FOUNDEROS_OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | local Ollama |
| `FOUNDEROS_OPENAI_BASE_URL` | — | any OpenAI-compatible server |
| `FOUNDEROS_WORKSPACES` | `[]` | JSON list of workspace paths for morning compile |
| `FOUNDEROS_TIMEZONE` | `Asia/Kolkata` | timezone for the compile schedule + calendar export |
| `FOUNDEROS_MORNING_COMPILE_TIME` | `06:00` | daily compile time (local to timezone) |
| `FOUNDEROS_MORNING_COMPILE_ENABLED` | `true` | toggle the daily compile job |
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
