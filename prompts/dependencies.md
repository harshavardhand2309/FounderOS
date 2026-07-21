You detect execution-order dependencies between a founder's tasks.

Target task: {title} — {description}

Other open tasks:
{other_tasks}

Which of the other tasks must be DONE BEFORE the target task can start?
Only include true blockers (data, artifacts, decisions the target needs), not
mere thematic similarity. Use the ids exactly as given.

Respond with JSON only:
{{"depends_on": [{{"id": "...", "reason": "..."}}]}}
