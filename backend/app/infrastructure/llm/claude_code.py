"""Claude Code CLI provider.

Routes completions through the locally installed ``claude`` CLI in headless
print mode (``claude -p --output-format json``). Because the CLI authenticates
with the user's Claude subscription (Pro/Max) via ``/login``, this path needs
no API credits — useful for founders who have a subscription but no separate
API budget.

Trade-offs vs the direct API provider: higher latency per call (CLI startup),
and it requires the ``claude`` binary to be installed and logged in on the
machine running the backend.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile

from app.core.logging import get_logger
from app.infrastructure.llm.base import CompletionRequest, LLMError, LLMProvider

logger = get_logger("llm.claude_code")


class ClaudeCodeProvider(LLMProvider):
    name = "claude-code"

    def __init__(self, binary: str, model: str, timeout_seconds: float) -> None:
        self._binary = binary
        self._model = model
        self._timeout = timeout_seconds

    def _build_command(self) -> list[str]:
        command = [self._binary, "-p", "--output-format", "json"]
        if self._model:
            command += ["--model", self._model]
        return command

    def complete(self, request: CompletionRequest) -> str:
        # System prompt is folded into the prompt text for CLI-version
        # robustness; the prompt travels via stdin to avoid ARG_MAX limits.
        full_prompt = f"{request.system}\n\n{request.prompt}" if request.system else request.prompt
        try:
            # Run from a neutral empty directory so the CLI doesn't pick up a
            # project context (CLAUDE.md, tools) from wherever the backend runs.
            with tempfile.TemporaryDirectory(prefix="founderos-cc-") as neutral_cwd:
                completed = subprocess.run(
                    self._build_command(),
                    input=full_prompt,
                    capture_output=True,
                    text=True,
                    timeout=self._timeout,
                    cwd=neutral_cwd,
                )
        except FileNotFoundError as exc:
            raise LLMError(f"Claude Code CLI not found ({self._binary!r}). Install it and run /login.") from exc
        except subprocess.TimeoutExpired as exc:
            raise LLMError(f"Claude Code CLI timed out after {self._timeout:.0f}s") from exc

        if completed.returncode != 0:
            stderr = (completed.stderr or completed.stdout or "").strip()[:400]
            raise LLMError(f"Claude Code CLI failed (exit {completed.returncode}): {stderr}")

        return self._parse_output(completed.stdout)

    @staticmethod
    def _parse_output(stdout: str) -> str:
        """``--output-format json`` emits one JSON object whose ``result``
        field carries the final text. Fall back to raw stdout defensively."""
        text = stdout.strip()
        if not text:
            raise LLMError("Claude Code CLI returned no output")
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            return text  # older CLI or text mode: treat stdout as the answer
        if isinstance(payload, dict):
            if payload.get("is_error"):
                raise LLMError(f"Claude Code CLI reported an error: {payload.get('result', '')!s:.300}")
            result = payload.get("result")
            if isinstance(result, str) and result.strip():
                return result
        raise LLMError("Claude Code CLI output had no usable 'result' field")

    def is_available(self) -> bool:
        return shutil.which(self._binary) is not None
