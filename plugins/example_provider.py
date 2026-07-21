"""Reference plugin provider (echo). See plugins/README.md.

Run the backend with:
    PYTHONPATH=plugins FOUNDEROS_LLM_PROVIDER="plugin:example_provider:EchoProvider" \
        python -m app.main
"""

from __future__ import annotations

import json

from app.infrastructure.llm.base import CompletionRequest, LLMProvider


class EchoProvider(LLMProvider):
    """Returns canned JSON so AI plumbing can be exercised without a model."""

    name = "echo"

    def __init__(self, settings) -> None:  # noqa: ANN001 - receives app Settings
        self._settings = settings

    def complete(self, request: CompletionRequest) -> str:
        return json.dumps(
            {
                "subtasks": [{"title": "Echo subtask", "task_type": "planning"}],
                "summary": "Echo provider active — configure a real model for useful output.",
                "questions": [],
                "duplicates": [],
                "depends_on": [],
            }
        )

    def is_available(self) -> bool:
        return True
