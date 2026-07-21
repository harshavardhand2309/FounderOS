# ADR 0003: Pluggable LLM providers with graceful degradation

**Status:** accepted

## Context

Local models change fast; users run different stacks (Ollama, llama.cpp, vLLM,
LM Studio, hosted APIs). Hard-coding one client would rot quickly, and making
core features depend on a model would break the local-first promise.

## Decision

- A minimal `LLMProvider` contract (`complete`, `is_available`) in
  `infrastructure/llm/base.py`.
- Built-ins: `ollama` (default, model `qwen3`) and `openai` (any
  OpenAI-compatible `/chat/completions` server).
- Third-party providers load from a dotted path
  (`FOUNDEROS_LLM_PROVIDER=plugin:module:Class`); failures disable AI, never
  crash the app.
- All prompts are files in `prompts/` (editable without code changes); all AI
  responses are requested and parsed as JSON.
- Deterministic fallbacks: estimation and prioritization are heuristic engines
  first — AI refines, never gates. Duplicate detection falls back to title
  similarity.

## Consequences

- Swapping models/providers is configuration, not code.
- Prompt iteration is a text-file edit.
- AI endpoints return 503 with actionable guidance when no provider is up.
