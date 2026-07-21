"""Pure, deterministic domain engines.

Engines hold the algorithmic core of FounderOS (estimation, prioritization,
dependency analysis, day planning, workload math). They depend only on domain
entities and configuration — no I/O, no sessions — which keeps every rule
unit-testable in isolation. Application services orchestrate them.
"""
