# How FounderOS decides your day — and how to check it's right

This is the guide for **verifying the system yourself**: what each stage of the
pipeline does, the exact formulas behind estimates and priorities, and a set of
test recipes where you know the correct answer in advance — so you can compare
what FounderOS produces against what it *should* produce.

## 1. The morning-compile pipeline (what runs at 06:00 IST)

Every stage feeds the next; each has a deterministic fallback, so a failure
never breaks the chain.

| # | Stage | What it does | Where |
|---|-------|--------------|-------|
| 1 | **Rollover** | Yesterday's unfinished plan entries are marked *moved*; their tasks stay open so they reschedule automatically | `planner_service.rollover` |
| 2 | **Workspace scan** | For each registered session directory: recent git commits, uncommitted files, `TODO`/`FIXME` markers in code, and the last ~exchanges of your local Claude Code transcripts (`~/.claude/projects/<encoded-path>/*.jsonl`) | `workspace_scanner.snapshot_workspace` |
| 3 | **Task derivation** | The snapshot goes to the configured model (`prompts/compile.md`) which returns 2–6 concrete tasks — type, estimate, importance, complexity, priority — placed on **that workspace's own board**. No model → heuristic tasks from the same signals | `workspace_scanner.scan_workspace` |
| 4 | **Dedupe** | New titles ≥75% similar to any open task on the board are skipped (`SequenceMatcher`), so re-running compile never duplicates work | `_is_duplicate` |
| 5 | **Priority recalc** | Every open task gets a fresh 0–100 score (formula below) | `task_service.recalculate_priorities` |
| 6 | **Day plan** | The planner packs the highest-scoring ready tasks into your available hours with session caps, breaks, and buffer (rules below); the overflow is explicitly deferred | `planner_service.generate` |

Ad-hoc paths that feed the same machinery: **document intake** (upload → study
time estimate → reading task) and **sprint generation** (backlog → capacity-
checked week selection).

## 2. The formulas (all constants in `shared/constants.json`)

**Estimation** (`EstimationEngine`): `base_minutes[task_type] ×
complexity_multiplier × difficulty_factor`, plus a knowledge-overhead bump for
high-`knowledge_value` tasks. Optimistic = ×0.7, pessimistic = ×1.8. When ≥3
completed tasks of that type exist, the estimate is blended 60/40 with your
**historical bias** (mean of actual÷estimated), so chronic underestimating
corrects itself.

**Priority score** (`PriorityEngine`, 0–100): weighted sum of urgency
(deadline proximity), importance, knowledge value, project priority, risk,
staleness, and manual priority (urgent/high/… as a ×0.85–×1.15 multiplier).
Blocked tasks are dampened ×0.6. Recomputed every 30 minutes and at compile.

**Planner rules** (`PlannerEngine`): max 2 research + 2 implementation +
1 writing + 1 review sessions/day · a 15-minute break every 90 minutes ·
15% of the day reserved as buffer · 10-minute context-switch penalty when
hopping projects (with a 15-point stickiness window that prefers staying on
one project) · deep-work tasks get blocks up to 120m, regular tasks are capped
at 90m · **excess work is deferred, never crammed**.

**Sprint capacity**: `available_hours × 60 × 5 days × 0.85`. AI selections are
hard-clamped to this — hallucinated task ids are dropped and overshoot is
trimmed (see `test_sprint.py`).

## 3. Validation recipes — plant a known signal, check the output

Each recipe states the expected result so a mismatch = a real finding. Run
them against a live backend (`Settings → Run compile now` or `curl`).

### R1 · Does it actually read my sessions?
Create a throwaway dir with one file containing `# TODO: rate-limit the API`,
and (optionally) a fake transcript mentioning "token refresh still failing" in
`~/.claude/projects/<dir-encoded>/x.jsonl` (encoding: every non-alphanumeric
char of the absolute path → `-`). Register it as a workspace with scan.
**Expected:** a board named after the dir, with a rate-limit task, and — if you
added the transcript — a task about resuming/fixing token refresh. Delete the
board afterwards.

### R2 · Does it duplicate work every morning?
Run compile twice back-to-back. **Expected:** second run reports
`tasks_created: 0` and `skipped_duplicates ≥` the first run's count.

### R3 · Are document estimates calibrated?
Paste a text of a known word count into Learning → Intake (e.g. 2 000 words of
plain prose). **Expected heuristic baseline:** reading ≈ words ÷ 200/min for
light prose (÷150 technical, ÷110 academic/math-heavy) + summarizing ≈ 15m +
reading÷6. So 2 000 light words ≈ 10m reading, ≈ 27m total; an AI refinement
may raise but never drop below the heuristic floor. If the numbers feel wrong
for *you*, adjust after a few reads by comparing to your logged actuals.

### R4 · Does the planner protect the day?
Create 10 tasks of 90m each, then plan a 4-hour day. **Expected:** only ~2–3
tasks scheduled, a break after ~90m, a buffer entry ≈ 15% of the day, and a
"N task(s) deferred beyond today" badge — never an overloaded schedule.

### R5 · Does estimation learn from me?
Create and complete 3+ coding tasks where you log ~2× the estimate as actual
work. Create a new coding task without an estimate. **Expected:** its generated
estimate is visibly higher than the base (bias blend), and its confidence
reflects the sample size.

### R6 · Do dependencies gate the plan?
Make task B depend on task A (both Ready). **Expected:** B drops out of plan
candidates and auto-blocks with "Waiting on: A"; completing A auto-unblocks B
on the next recalc. Creating A→B→A must be refused as a cycle.

### R7 · Is the sprint honest about capacity?
With ~40h of estimated backlog and 8h/day prefs, propose a sprint.
**Expected:** `planned_minutes ≤ 2040` (34h), tasks ordered/balanced, the rest
in stretch or left out. Accepting labels tasks `sprint:<monday>` and writes a
decision-log note you can audit later.

### R8 · Does semantic search find meaning, not strings?
Needs `ollama pull nomic-embed-text`. Create "Fix OAuth login redirect", wait
for/trigger a reindex, search **"sign-in flow"** in ⌘K. **Expected:** the task
appears with an *≈ semantic* badge despite zero keyword overlap. Without the
model, the same search returns nothing extra — and Settings says keyword-only.

### R9 · The automated baseline
```bash
cd backend && .venv/bin/python -m pytest ../tests/backend   # 177 tests
```
These encode all of the above as regression tests (`test_automation.py`,
`test_sprint.py`, `test_semantic_search.py`, engine tests) — if you change
constants or prompts, this is your safety net.

## 4. Measuring accuracy over time

The honest metric is **estimate vs. actual**: log real minutes on tasks (the
detail sheet's *Log work*), and watch (a) the dashboard's velocity/burndown,
(b) per-type bias in new estimates, (c) whether "deferred beyond today" counts
shrink — a well-calibrated system defers *predictably*, not chaotically. AI
task derivation is judged the same way: after a week, count how many derived
tasks you actually did vs. deleted; tune `prompts/compile.md` wording (it's
plain markdown, hot-editable) if it invents work you don't want.
