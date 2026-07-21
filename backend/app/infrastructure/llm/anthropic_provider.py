"""Anthropic Claude provider (Claude API via the official SDK).

Default model: claude-opus-4-8. Opus 4.8 uses adaptive thinking and rejects
sampling parameters (temperature/top_p/top_k) and thinking budgets — so this
provider deliberately ignores ``CompletionRequest.temperature`` and never
sends a ``thinking`` budget.
"""

from __future__ import annotations

import anthropic

from app.core.logging import get_logger
from app.infrastructure.llm.base import CompletionRequest, LLMError, LLMProvider

logger = get_logger("llm.anthropic")

_MAX_TOKENS_FLOOR = 4096  # JSON planning payloads need headroom


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, api_key: str, model: str, timeout_seconds: float) -> None:
        # Empty api_key falls back to the SDK's environment resolution
        # (ANTHROPIC_API_KEY / auth profile).
        self._client = anthropic.Anthropic(
            api_key=api_key or None,
            timeout=timeout_seconds,
            max_retries=2,
        )
        self._model = model
        self._configured = bool(api_key)

    def complete(self, request: CompletionRequest) -> str:
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=max(request.max_tokens, _MAX_TOKENS_FLOOR),
                system=request.system or anthropic.NOT_GIVEN,
                thinking={"type": "adaptive"},
                messages=[{"role": "user", "content": request.prompt}],
            )
        except anthropic.RateLimitError as exc:
            raise LLMError(f"Anthropic rate limited: {exc.message}") from exc
        except anthropic.APIStatusError as exc:
            raise LLMError(f"Anthropic API error {exc.status_code}: {exc.message}") from exc
        except anthropic.APIConnectionError as exc:
            raise LLMError(f"Anthropic connection failed: {exc}") from exc

        if response.stop_reason == "refusal":
            raise LLMError("Anthropic declined the request (safety refusal)")

        text = "".join(block.text for block in response.content if block.type == "text")
        if not text:
            raise LLMError("Anthropic returned no text content")
        return text

    def is_available(self) -> bool:
        # Cheap local check: a key is configured (explicitly or via env).
        # Network failures surface as LLMError on the actual call.
        import os

        return self._configured or bool(os.environ.get("ANTHROPIC_API_KEY"))
