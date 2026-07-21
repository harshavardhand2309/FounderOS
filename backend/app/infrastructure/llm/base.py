"""LLM provider contract.

Providers are pluggable: Ollama ships as the default, any OpenAI-compatible
server is built in, and third-party providers load from a dotted path (see
``factory.resolve_provider`` and plugins/README.md).
"""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class CompletionRequest:
    prompt: str
    system: str = ""
    json_mode: bool = False  # ask the provider for strictly-JSON output
    temperature: float = 0.3
    max_tokens: int = 2048


class LLMError(RuntimeError):
    """Provider unreachable or returned an unusable response."""


class LLMProvider(ABC):
    """Minimal synchronous completion interface every provider implements."""

    name: str = "base"

    @abstractmethod
    def complete(self, request: CompletionRequest) -> str: ...

    @abstractmethod
    def is_available(self) -> bool:
        """Cheap health probe; must never raise."""


def extract_json(text: str) -> dict | list:
    """Pull the first JSON object/array out of a model response.

    Local models often wrap JSON in prose or code fences (and reasoning models
    in <think> blocks); this strips all of that before parsing.
    """
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    cleaned = re.sub(r"```(?:json)?", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    for opener, closer in (("{", "}"), ("[", "]")):
        start = cleaned.find(opener)
        if start < 0:
            continue
        depth = 0
        for i in range(start, len(cleaned)):
            char = cleaned[i]
            if char == opener:
                depth += 1
            elif char == closer:
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(cleaned[start : i + 1])
                    except json.JSONDecodeError:
                        break
    raise LLMError(f"Model did not return parseable JSON: {text[:200]!r}")
