# FounderOS Architecture

FounderOS is a local-first, single-user web application: a FastAPI backend owning
a SQLite database, and a React SPA talking to it over a typed REST API. No cloud,
no auth, fully offline; the optional LLM is a local Ollama model.

## Clean architecture layers (backend)

```
backend/app/
├── core/            configuration (pydantic-settings + shared/constants.json), logging
├── domain/          entities (SQLModel tables) + enums — no business logic beyond invariants
├── application/
│   ├── engines/     PURE algorithms: estimation, priority, dependencies, planner,
│   │                workload, knowledge scoring. No I/O — fully unit-testable.
│   ├── services/    orchestration: repos + engines + activity logging
│   ├── interfaces.py  repository Protocols the services depend on
│   └── jobs.py      APScheduler job bodies
├── infrastructure/
│   ├── db.py        engine/session management (SQLite WAL, FK pragmas)
│   ├── repositories/ SQLModel implementations of the protocols
│   ├── llm/         provider abstraction: base contract, Ollama, OpenAI-compatible,
│   │                plugin loader (see plugins/README.md)
│   ├── scheduler.py APScheduler wiring
│   └── files/       watchdog markdown-vault watcher
└── presentation/
    ├── api/routes/  FastAPI routers (one per resource) under /api
    ├── api/deps.py  dependency-injection wiring (session → repos → engines → services)
    └── schemas/     pydantic request/response DTOs
```

**Dependency rule:** presentation → application → domain; infrastructure implements
application interfaces. Engines never import repositories or sessions.

## The engines

| Engine | Input | Output | Key rules |
|---|---|---|---|
| Estimation | task attributes + completion history | optimistic/realistic/pessimistic + confidence | per-type base × complexity × difficulty; historical actual/estimate bias blended at 60%; confidence falls with complexity and erratic history |
| Priority | task + cross-task context | 0–100 score + component breakdown | weighted: deadline urgency (exp ramp), business impact, unblock count, knowledge value, project priority, risk, effort efficiency; manual priority is a multiplier; blocked dampened ×0.6 |
| Dependencies | tasks + edges | blocked set, unblock map, topo order, cycles | auto-block on unmet deps, auto-unblock when resolved (only auto-blocked ones), cycle-safe edge insertion |
| Planner | prioritized candidates + constraints | timed day plan + unplanned overflow | session caps (2 research/2 implementation/1 writing/1 review), break every 90m, 15% buffer, context-switch penalty, project stickiness window, deep work gets long blocks, learning slot when reading is active |
| Workload | open tasks + session history | capacity, burn rate, completion projections, overload | 14-day burn window; projections per project and global |
| Knowledge | checklist flags | 0–100 score | weights in shared/constants.json; completion ≠ knowledge |

## Data flow examples

**Creating a task** → TaskService.create: heuristic/historical estimate applied,
learning checklist auto-attached for research-flavored work, priority scores
recalculated for all open tasks, activity logged.

**Generating a day plan** → PlannerService.generate: candidates = ready/working,
unblocked, with remaining minutes; locked/done entries carried over; engine packs
sessions/breaks/buffer; excess reported as deferred. Nightly job marks unfinished
entries `moved`; because tasks stay open, the next plan re-includes them —
continuous rescheduling with no manual cleanup.

**Background jobs** (APScheduler): priority recalc every 30 min; rollover at 03:00.

## Frontend

```
frontend/src/
├── api/          typed client, central query keys, TanStack Query hooks
├── components/   ui/ (shadcn-style primitives) + layout/ (shell, palette, theme)
├── features/     kanban, planner, dashboard, projects, notes, learning, settings
└── lib/          display vocabulary, utils
```

- Single source of API types: `src/api/types.ts` mirrors backend DTOs; the
  vocabulary (statuses, planner constants) lives in `shared/constants.json`,
  loaded by backend config and mirrored in frontend types.
- All server state via TanStack Query; mutations invalidate the task-world keys.
- Heavy routes (TipTap notes, Recharts dashboard) are code-split.

## LLM integration

`FOUNDEROS_LLM_PROVIDER` ∈ `ollama` (default, model qwen3) | `openai` (any
OpenAI-compatible endpoint) | `none` | `plugin:module:Class`. All AI output is
requested as JSON and parsed defensively (`extract_json` strips fences, prose,
`<think>` blocks). Every AI feature has a defined failure mode: 503 with guidance,
or a deterministic heuristic (duplicates, estimation, prioritization).

## Testing

`tests/backend/` — 157 pytest cases: engine unit tests (pure) + API integration
tests against a fresh SQLite per test. Run: `cd backend && .venv/bin/python -m
pytest ../tests/backend`.
