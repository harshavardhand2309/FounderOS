"""Provider resolution.

``FOUNDEROS_LLM_PROVIDER`` selects the provider:
- "ollama"              -> local Ollama (default; model FOUNDEROS_LLM_MODEL, default qwen3)
- "openai"              -> any OpenAI-compatible server (FOUNDEROS_OPENAI_BASE_URL)
- "anthropic"           -> Claude API (FOUNDEROS_ANTHROPIC_MODEL, default claude-opus-4-8;
                           key via FOUNDEROS_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY)
- "claude-code"         -> the Claude Code CLI in headless mode; runs on the
                           user's Claude subscription, no API credits needed
- "none"                -> AI features disabled; heuristics only
- "plugin:pkg.mod:Cls"  -> dotted-path class implementing LLMProvider
                           (see plugins/README.md for the contract)
"""

from __future__ import annotations

import importlib

from app.core.config import Settings
from app.core.logging import get_logger
from app.infrastructure.llm.base import LLMProvider
from app.infrastructure.llm.ollama import OllamaProvider
from app.infrastructure.llm.openai_compat import OpenAICompatProvider

logger = get_logger("llm.factory")


def resolve_provider(settings: Settings) -> LLMProvider | None:
    spec = settings.llm_provider.strip().lower()
    if spec in ("", "none", "off", "disabled"):
        return None
    if spec == "ollama":
        return OllamaProvider(
            base_url=settings.ollama_base_url,
            model=settings.llm_model,
            timeout_seconds=settings.llm_timeout_seconds,
        )
    if spec == "openai":
        return OpenAICompatProvider(
            base_url=settings.openai_base_url,
            api_key=settings.openai_api_key,
            model=settings.llm_model,
            timeout_seconds=settings.llm_timeout_seconds,
        )
    if spec == "anthropic":
        from app.infrastructure.llm.anthropic_provider import AnthropicProvider

        return AnthropicProvider(
            api_key=settings.anthropic_api_key,
            model=settings.anthropic_model,
            timeout_seconds=settings.llm_timeout_seconds,
        )
    if spec in ("claude-code", "claude_code", "claudecode"):
        from app.infrastructure.llm.claude_code import ClaudeCodeProvider

        return ClaudeCodeProvider(
            binary=settings.claude_code_binary,
            model=settings.claude_code_model,
            timeout_seconds=settings.llm_timeout_seconds,
        )
    if spec.startswith("plugin:"):
        return _load_plugin(settings.llm_provider[len("plugin:") :], settings)
    logger.warning("Unknown LLM provider %r; AI features disabled", settings.llm_provider)
    return None


def _load_plugin(path: str, settings: Settings) -> LLMProvider | None:
    """Load ``package.module:ClassName``; the class receives the Settings object."""
    try:
        module_path, _, class_name = path.partition(":")
        module = importlib.import_module(module_path)
        provider_cls = getattr(module, class_name)
        provider = provider_cls(settings)
        if not isinstance(provider, LLMProvider):
            raise TypeError(f"{path} does not implement LLMProvider")
        return provider
    except Exception:
        logger.exception("Failed to load plugin provider %r; AI features disabled", path)
        return None
