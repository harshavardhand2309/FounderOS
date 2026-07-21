# ADR 0002: Local-first, single-user, no auth

**Status:** accepted

## Context

FounderOS is an operating system for one founder's work. Requiring accounts or
cloud sync would add latency, privacy exposure and a server dependency for a
tool whose core value is instant, always-available planning.

## Decision

- All data in a local SQLite file (`database/founderos.db`, WAL mode).
- No authentication; the API binds to 127.0.0.1.
- The only optional network dependency is a *local* LLM (Ollama). Every feature
  has a non-AI path.
- Future sync (if any) will be layered on as export/merge, not by moving the
  source of truth to a server.

## Consequences

- Zero-latency UX; works on a plane.
- Multi-device use requires a future sync layer (out of scope for v1).
- Single-writer assumptions are safe (one UserPrefs row, no row locking).
