"""Embedding providers for semantic search.

Kept separate from the completion providers: the chat model (e.g. Opus via the
Claude Code CLI) usually can't embed, so semantic search runs on its own
provider — typically a small local Ollama model — and the keyword search path
keeps working when none is configured.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import httpx

from app.core.logging import get_logger
from app.infrastructure.llm.base import LLMError

logger = get_logger("llm.embeddings")


class EmbeddingProvider(ABC):
    """Batch text → vector interface. ``embed`` raises LLMError on failure."""

    name: str = "base"
    model: str = ""

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]: ...

    @abstractmethod
    def is_available(self) -> bool:
        """Cheap health probe; must never raise."""


class OllamaEmbeddings(EmbeddingProvider):
    name = "ollama"

    def __init__(self, base_url: str, model: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self.model = model
        self._timeout = timeout_seconds

    def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            response = httpx.post(
                f"{self._base_url}/api/embed",
                json={"model": self.model, "input": texts},
                timeout=self._timeout,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMError(f"Ollama embed request failed: {exc}") from exc
        vectors = response.json().get("embeddings", [])
        if len(vectors) != len(texts):
            raise LLMError("Ollama returned a mismatched number of embeddings")
        return vectors

    def is_available(self) -> bool:
        try:
            response = httpx.get(f"{self._base_url}/api/tags", timeout=2.0)
            if response.status_code != 200:
                return False
            models = [m.get("name", "") for m in response.json().get("models", [])]
            return any(name.split(":")[0] == self.model.split(":")[0] for name in models)
        except httpx.HTTPError:
            return False


class OpenAICompatEmbeddings(EmbeddingProvider):
    name = "openai"

    def __init__(self, base_url: str, api_key: str, model: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self.model = model
        self._timeout = timeout_seconds

    def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            response = httpx.post(
                f"{self._base_url}/embeddings",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={"model": self.model, "input": texts},
                timeout=self._timeout,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMError(f"Embeddings request failed: {exc}") from exc
        data = sorted(response.json().get("data", []), key=lambda d: d.get("index", 0))
        vectors = [d.get("embedding", []) for d in data]
        if len(vectors) != len(texts):
            raise LLMError("Embeddings endpoint returned a mismatched batch")
        return vectors

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
