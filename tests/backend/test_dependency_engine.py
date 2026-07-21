"""Tests for the dependency graph engine (pure, no DB needed)."""

from __future__ import annotations

from app.application.engines.dependencies import DependencyEngine
from app.domain.entities import Task, TaskDependency
from app.domain.enums import TaskStatus


def make_task(task_id: str, status: TaskStatus = TaskStatus.READY) -> Task:
    return Task(id=task_id, title=task_id, status=status)


def dep(task_id: str, depends_on_id: str) -> TaskDependency:
    """Edge meaning ``task_id`` waits on ``depends_on_id``."""
    return TaskDependency(
        id=f"{task_id}<-{depends_on_id}", task_id=task_id, depends_on_id=depends_on_id
    )


def test_task_with_unmet_dependency_is_blocked():
    """A task whose prerequisite is still open is reported blocked."""
    tasks = [make_task("a"), make_task("b")]
    analysis = DependencyEngine().analyze(tasks, [dep("b", "a")])
    assert analysis.blocked_task_ids == frozenset({"b"})
    assert analysis.blocking_map == {"b": ["a"]}


def test_done_dependency_does_not_block():
    """A prerequisite in DONE status no longer blocks its dependent."""
    tasks = [make_task("a", TaskStatus.DONE), make_task("b")]
    analysis = DependencyEngine().analyze(tasks, [dep("b", "a")])
    assert analysis.blocked_task_ids == frozenset()
    assert analysis.blocking_map == {}


def test_archived_dependency_does_not_block():
    """A prerequisite in ARCHIVED status is terminal and does not block."""
    tasks = [make_task("a", TaskStatus.ARCHIVED), make_task("b")]
    analysis = DependencyEngine().analyze(tasks, [dep("b", "a")])
    assert analysis.blocked_task_ids == frozenset()


def test_only_unmet_dependencies_listed_in_blocking_map():
    """blocking_map lists only the still-open prerequisites, not the done ones."""
    tasks = [make_task("a", TaskStatus.DONE), make_task("b"), make_task("c")]
    analysis = DependencyEngine().analyze(tasks, [dep("c", "a"), dep("c", "b")])
    assert analysis.blocking_map == {"c": ["b"]}


def test_terminal_task_itself_never_reported_blocked():
    """A DONE task is skipped entirely even if its prerequisite is open."""
    tasks = [make_task("a"), make_task("b", TaskStatus.DONE)]
    analysis = DependencyEngine().analyze(tasks, [dep("b", "a")])
    assert "b" not in analysis.blocked_task_ids


def test_unblocks_map_lists_open_dependents():
    """Finishing an open prerequisite maps to every open task it enables."""
    tasks = [make_task("a"), make_task("b"), make_task("c")]
    analysis = DependencyEngine().analyze(tasks, [dep("b", "a"), dep("c", "a")])
    assert analysis.unblocks_map == {"a": ["b", "c"]}


def test_unblocks_map_excludes_done_dependents():
    """A dependent already finished does not appear as unblockable work."""
    tasks = [make_task("a"), make_task("b", TaskStatus.DONE), make_task("c")]
    analysis = DependencyEngine().analyze(tasks, [dep("b", "a"), dep("c", "a")])
    assert analysis.unblocks_map == {"a": ["c"]}


def test_unblocks_map_excludes_terminal_prerequisites():
    """A DONE prerequisite has nothing left to unblock, so it gets no entry."""
    tasks = [make_task("a", TaskStatus.DONE), make_task("b")]
    analysis = DependencyEngine().analyze(tasks, [dep("b", "a")])
    assert "a" not in analysis.unblocks_map


def test_edges_referencing_unknown_tasks_are_ignored():
    """Edges pointing at tasks outside the given set never block anything."""
    tasks = [make_task("a")]
    analysis = DependencyEngine().analyze(tasks, [dep("a", "ghost"), dep("ghost", "a")])
    assert analysis.blocked_task_ids == frozenset()
    assert analysis.unblocks_map == {}
    assert analysis.topological_order == ["a"]


def test_would_create_cycle_self_edge():
    """A task depending on itself is always a cycle."""
    assert DependencyEngine().would_create_cycle([], "a", "a") is True


def test_would_create_cycle_direct():
    """With b waiting on a, adding a-waits-on-b closes a two-node loop."""
    edges = [dep("b", "a")]
    assert DependencyEngine().would_create_cycle(edges, "a", "b") is True


def test_would_create_cycle_transitive():
    """With c -> b -> a as a prerequisite chain, adding a-waits-on-c loops."""
    edges = [dep("b", "a"), dep("c", "b")]
    assert DependencyEngine().would_create_cycle(edges, "a", "c") is True


def test_safe_edge_does_not_report_cycle():
    """An edge that closes no loop is accepted."""
    edges = [dep("b", "a")]
    assert DependencyEngine().would_create_cycle(edges, "c", "a") is False
    assert DependencyEngine().would_create_cycle(edges, "b", "c") is False


def test_topological_order_respects_prerequisites():
    """Every prerequisite appears before its dependent in the ordering."""
    tasks = [make_task(t) for t in ("a", "b", "c", "d")]
    edges = [dep("b", "a"), dep("c", "b")]  # chain a -> b -> c; d independent
    analysis = DependencyEngine().analyze(tasks, edges)
    order = analysis.topological_order
    assert sorted(order) == ["a", "b", "c", "d"]
    assert order.index("a") < order.index("b") < order.index("c")
    assert analysis.cycle_task_ids == frozenset()


def test_topological_order_diamond():
    """Diamond graph: source first, sink last, all nodes ordered."""
    tasks = [make_task(t) for t in ("a", "b", "c", "d")]
    edges = [dep("b", "a"), dep("c", "a"), dep("d", "b"), dep("d", "c")]
    order = DependencyEngine().analyze(tasks, edges).topological_order
    assert order[0] == "a"
    assert order[-1] == "d"
    assert sorted(order) == ["a", "b", "c", "d"]


def test_cycle_nodes_reported_and_excluded_from_order():
    """Tasks stuck in a cycle are reported and left out of the topo order."""
    tasks = [make_task("a"), make_task("b"), make_task("c")]
    edges = [dep("a", "b"), dep("b", "a")]  # a and b wait on each other
    analysis = DependencyEngine().analyze(tasks, edges)
    assert analysis.cycle_task_ids == frozenset({"a", "b"})
    assert analysis.topological_order == ["c"]


def test_nodes_downstream_of_cycle_also_reported_cyclic():
    """A task waiting on a cycle can never start, so it is flagged too."""
    tasks = [make_task("a"), make_task("b"), make_task("c")]
    edges = [dep("a", "b"), dep("b", "a"), dep("c", "a")]
    analysis = DependencyEngine().analyze(tasks, edges)
    assert analysis.cycle_task_ids == frozenset({"a", "b", "c"})
    assert analysis.topological_order == []
