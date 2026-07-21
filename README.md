# FounderOS

**A local-first AI operating system for founders running multiple research-heavy projects.**

Not another Kanban board: FounderOS organizes projects, estimates and prioritizes work,
generates daily plans, detects blocked tasks, tracks learning depth, and continuously
reschedules unfinished work — so you never have to ask *"what should I do next?"*

- **Local-first** — everything works offline; data lives in a local SQLite file.
- **Single-user** — no auth, no cloud dependency.
- **AI-assisted** — Ollama (`qwen3`) by default; any OpenAI-compatible API pluggable;
  deterministic heuristics when no model is available.

## Quick start

```bash
# Backend (Python 3.11+)
cd backend
uv venv .venv && uv pip install -e ".[dev]"
.venv/bin/python -m app.main            # serves http://127.0.0.1:8000

# Frontend (Node 20+)
cd frontend
npm install
npm run dev                             # serves http://localhost:5173 (proxies /api)
```

## Repository layout

| Path         | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `frontend/`  | React + TypeScript + Vite + Tailwind + shadcn/ui   |
| `backend/`   | FastAPI + SQLModel, clean architecture             |
| `shared/`    | Constants shared by both sides (`constants.json`)  |
| `database/`  | Local SQLite data (gitignored)                     |
| `plugins/`   | Pluggable LLM providers and extensions             |
| `prompts/`   | Prompt templates for AI features                   |
| `models/`    | LLM model registry/configuration                   |
| `tests/`     | Backend test suite                                 |
| `docs/`      | Architecture docs and ADRs                         |

See `docs/` for architecture details.
