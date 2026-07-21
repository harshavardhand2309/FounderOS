"""Provider for any OpenAI-compatible chat completions server
(llama.cpp server, vLLM, LM Studio, LiteLLM, an actual OpenAI endpoint, …)."""

from __future__ import annotations

import httpx

from app.core.logging import get_logger
from app.infrastructure.llm.base import CompletionRequest, LLMError, LLMProvider

logger = get_logger("llm.openai")


class OpenAICompatProvider(LLMProvider):
    name = "openai"

    def __init__(self, base_url: str, api_key: str, model: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._model = model
        self._timeout = timeout_seconds

    def complete(self, request: CompletionRequest) -> str:
        messages = []
        if request.system:
            messages.append({"role": "system", "content": request.system})
        messages.append({"role": "user", "content": request.prompt})
        payload: dict = {
            "model": self._model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }
        if request.json_mode:
            payload["response_format"] = {"type": "json_object"}
        try:
            response = httpx.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=self._timeout,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMError(f"OpenAI-compatible request failed: {exc}") from exc
        body = response.json()
        try:
            text = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise LLMError(f"Unexpected response shape: {body}") from exc
        if not text:
            raise LLMError("Provider returned an empty response")
        return text

    def is_available(self) -> bool:
        try:
            response = httpx.get(
                f"{self._base_url}/models",
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=2.0,
            )
            return response.status_code == 200
        except httpx.HTTPError:
            return False
