import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { useMoveTask } from "@/api/hooks";
import type { Board, Task, TaskStatus } from "@/api/types";
import { TaskCard } from "@/features/kanban/TaskCard";
import { BOARD_STATUSES, STATUS_DOT_CLASSES, STATUS_LABELS } from "@/lib/display";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  board: Board;
  onOpenTask: (taskId: string) => void;
}

function ColumnShell({
  status,
  count,
  children,
}: {
  status: TaskStatus;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { status } });
  return (
    <div className="flex h-full w-64 shrink-0 flex-col">
      <div className="flex items-center gap-2 px-1.5 pb-2">
        <span className={cn("h-2 w-2 rounded-full", STATUS_DOT_CLASSES[status])} />
        <span className="text-xs font-medium">{STATUS_LABELS[status]}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-transparent bg-muted/40 p-1.5 transition-colors",
          isOver && "border-primary/40 bg-primary/5",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function KanbanBoard({ board, onOpenTask }: KanbanBoardProps) {
  const moveTask = useMoveTask();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = useMemo(() => {
    const byStatus = new Map(board.columns.map((c) => [c.status, c.tasks]));
    return BOARD_STATUSES.map((status) => ({ status, tasks: byStatus.get(status) ?? [] }));
  }, [board]);

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const column of board.columns) for (const task of column.tasks) map.set(task.id, task);
    return map;
  }, [board]);

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasksById.get(String(event.active.id)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const task = tasksById.get(taskId);
    if (!task) return;

    const overId = String(over.id);
    let targetStatus: TaskStatus | null = null;
    let beforeSequence: number | null = null;

    if (overId.startsWith("column-")) {
      targetStatus = overId.slice("column-".length) as TaskStatus;
    } else {
      const overTask = tasksById.get(overId);
      if (!overTask) return;
      targetStatus = overTask.status;
      // Insert just before the card we dropped onto.
      beforeSequence = overTask.sequence - 0.5;
    }

    if (!targetStatus) return;
    if (targetStatus === task.status && beforeSequence === null) return;
    moveTask.mutate({ id: taskId, status: targetStatus, before_sequence: beforeSequence });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {columns.map(({ status, tasks }) => (
          <ColumnShell key={status} status={status} count={tasks.length}>
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
              ))}
            </SortableContext>
            {tasks.length === 0 && (
              <div className="flex flex-1 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                Drop here
              </div>
            )}
          </ColumnShell>
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="w-64 rotate-2 opacity-90">
            <TaskCard task={activeTask} onOpen={() => undefined} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
