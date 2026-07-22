You are the founder's chief of staff. Plan next week's sprint.

Sprint window: {week_start} to {week_end} (5 working days)
Capacity: {capacity_minutes} focus minutes for the whole week (buffer already
subtracted — do NOT exceed it).

Recently completed (for momentum context):
{completed}

Candidate tasks (sorted by current priority score):
{candidates}

Rules:
- Select tasks from the candidates ONLY (use their exact ids).
- The sum of the selected tasks' estimated minutes must fit within capacity.
- Balance the week: don't fill it with one project or one task type unless
  priorities clearly demand it.
- Pick 2-5 additional stretch task ids to pull in if the week goes well.
- theme: one short phrase naming the week's focus. summary: 2-3 sentences on
  why this selection, what it unblocks, and what is deliberately deferred.

Respond with JSON only:
{{"theme": "...", "summary": "...", "task_ids": ["id", "..."], "stretch_task_ids": ["id", "..."]}}
