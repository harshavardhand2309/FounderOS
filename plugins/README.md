# FounderOS plugins

FounderOS keeps LLM providers pluggable. Besides the built-in `ollama` and
`openai` (any OpenAI-compatible server) providers, you can ship your own.

## Writing a provider plugin

1. Implement `LLMProvider` (see `backend/app/infrastructure/llm/base.py`):
   a class with `complete(request: CompletionRequest) -> str` and
   `is_available() -> bool`. Its `__init__` receives the app `Settings` object.
2. Make the module importable by the backend process (install it into the
   backend venv, or drop it on `PYTHONPATH` — this directory works:
   `PYTHONPATH=plugins`).
3. Point the app at it:

```bash
FOUNDEROS_LLM_PROVIDER="plugin:my_provider:MyProvider" python -m app.main
```

`example_provider.py` in this directory is a complete, working reference —
an echo provider useful for testing the AI plumbing offline.

## Failure behavior

If the plugin fails to import or misbehaves, FounderOS logs the error and
runs with AI disabled — core features never depend on a provider.
