"""Ollama provider (default: local qwen3)."""

from __future__ import annotations

import httpx

from app.core.logging import get_logger
from app.infrastructure.llm.base import CompletionRequest, LLMError, LLMProvider

logger = get_logger("llm.ollama")


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self, base_url: str, model: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout_seconds

    def complete(self, request: CompletionRequest) -> str:
        payload: dict = {
            "model": self._model,
            "prompt": request.prompt,
            "system": request.system,
            "stream": False,
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens,
            },
        }
        if request.json_mode:
            payload["format"] = "json"
        try:
            response = httpx.post(
                f"{self._base_url}/api/generate", json=payload, timeout=self._timeout
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMError(f"Ollama request failed: {exc}") from exc
        body = response.json()
        text = body.get("response", "")
        if not text:
            raise LLMError("Ollama returned an empty response")
        return text

    def is_available(self) -> bool:
        try:
            response = httpx.get(f"{self._base_url}/api/tags", timeout=2.0)
            return response.status_code == 200
        except httpx.HTTPError:
            return False
