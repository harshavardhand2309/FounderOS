# ADR 0001: SQLModel tables double as domain entities

**Status:** accepted

## Context

Clean architecture often separates domain entities from ORM models, mapping
between them at the infrastructure boundary. For a single-user local app with
one storage engine (SQLite) that mapping layer is pure overhead: every field
appears three times (entity, ORM model, mapper) and drift becomes the main bug
source.

## Decision

SQLModel table classes in `app/domain/entities.py` ARE the domain entities.
Business rules stay out of them — all logic lives in `application/engines`
(pure) and `application/services` (orchestration). Services depend on repository
Protocols, not sessions, so the persistence choice remains swappable at the
repository layer rather than the entity layer.

## Consequences

- One definition per concept; pydantic validation for free on every field.
- Entities must avoid `from __future__ import annotations` (SQLModel resolves
  relationship targets from evaluated annotations).
- If a second storage backend ever matters, the repository layer is the seam.
