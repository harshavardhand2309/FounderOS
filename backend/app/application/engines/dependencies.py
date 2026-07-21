"""Dependency graph engine.

Answers: which tasks are blocked, what does finishing a task unblock, is a
new edge safe (no cycles), and in what order should work happen.
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field

from app.domain.entities import Task, TaskDependency
from app.domain.enums import TaskStatus

_TERMINAL_STATUSES = frozenset({TaskStatus.DONE, TaskStatus.ARCHIVED})


@dataclass(frozen=True)
class DependencyAnalysis:
    blocked_task_ids: frozenset[str]
    # task_id -> ids of unfinished tasks it waits on
    blocking_map: dict[str, list[str]] = field(default_factory=dict)
    # task_id -> ids of open tasks that finishing it would help unblock
    unblocks_map: dict[str, list[str]] = field(default_factory=dict)
    topological_order: list[str] = field(default_factory=list)
    cycle_task_ids: frozenset[str] = frozenset()


class DependencyEngine:
    def analyze(self, tasks: list[Task], edges: list[TaskDependency]) -> DependencyAnalysis:
        by_id = {t.id: t for t in tasks}
        waits_on: dict[str, list[str]] = defaultdict(list)  # task -> prerequisites
        enables: dict[str, list[str]] = defaultdict(list)  # prerequisite -> dependents

        for edge in edges:
            if edge.task_id in by_id and edge.depends_on_id in by_id:
                waits_on[edge.task_id].append(edge.depends_on_id)
                enables[edge.depends_on_id].append(edge.task_id)

        blocking_map: dict[str, list[str]] = {}
        for task in tasks:
            if task.status in _TERMINAL_STATUSES:
                continue
            unmet = [
                dep_id
                for dep_id in waits_on.get(task.id, [])
                if by_id[dep_id].status not in _TERMINAL_STATUSES
            ]
            if unmet:
                blocking_map[task.id] = unmet

        unblocks_map: dict[str, list[str]] = {}
        for task in tasks:
            if task.status in _TERMINAL_STATUSES:
                continue
            dependents = [
                dep_id
                for dep_id in enables.get(task.id, [])
                if by_id[dep_id].status not in _TERMINAL_STATUSES
            ]
            if dependents:
                unblocks_map[task.id] = dependents

        order, cyclic = self._topological_sort(list(by_id.keys()), waits_on)
        return DependencyAnalysis(
            blocked_task_ids=frozenset(blocking_map.keys()),
            blocking_map=blocking_map,
            unblocks_map=unblocks_map,
            topological_order=order,
            cycle_task_ids=frozenset(cyclic),
        )

    def would_create_cycle(
        self, edges: list[TaskDependency], task_id: str, depends_on_id: str
    ) -> bool:
        """True if adding ``task_id -> depends_on_id`` closes a loop."""
        if task_id == depends_on_id:
            return True
        # Follow prerequisite chains from depends_on_id; reaching task_id = cycle.
        waits_on: dict[str, list[str]] = defaultdict(list)
        for edge in edges:
            waits_on[edge.task_id].append(edge.depends_on_id)
        seen: set[str] = set()
        stack = [depends_on_id]
        while stack:
            current = stack.pop()
            if current == task_id:
                return True
            if current in seen:
                continue
            seen.add(current)
            stack.extend(waits_on.get(current, []))
        return False

    @staticmethod
    def _topological_sort(
        node_ids: list[str], waits_on: dict[str, list[str]]
    ) -> tuple[list[str], set[str]]:
        """Kahn's algorithm; returns (order, nodes stuck in cycles)."""
        indegree: dict[str, int] = {node: 0 for node in node_ids}
        dependents: dict[str, list[str]] = defaultdict(list)
        for task_id, prereqs in waits_on.items():
            for prereq in prereqs:
                if task_id in indegree and prereq in indegree:
                    indegree[task_id] += 1
                    dependents[prereq].append(task_id)

        queue = deque(sorted(node for node, deg in indegree.items() if deg == 0))
        order: list[str] = []
        while queue:
            node = queue.popleft()
            order.append(node)
            for dependent in dependents.get(node, []):
                indegree[dependent] -= 1
                if indegree[dependent] == 0:
                    queue.append(dependent)

        cyclic = {node for node in node_ids if node not in set(order)}
        return order, cyclic
