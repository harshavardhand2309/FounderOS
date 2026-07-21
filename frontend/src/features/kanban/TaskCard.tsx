import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Brain, CalendarDays, Lock, Zap } from "lucide-react";
import type { Task } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_CLASSES, scoreTone } from "@/lib/display";
import { cn, formatDate, formatMinutes } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onOpen: (taskId: string) => void;
}

export function TaskCard({ task, onOpen }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
  });

  const overdue = task.deadline !== null && new Date(task.deadline) < new Date() && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task.id)}
      className={cn(
        "group cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-colors hover:border-primary/40",
        isDragging && "z-10 opacity-60 ring-1 ring-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium leading-snug">{task.title}</span>
        <span
          className={cn("shrink-0 font-mono text-[11px] tabular-nums", scoreTone(task.priority_score))}
          title="Priority score"
        >
          {Math.round(task.priority_score)}
        </span>
      </div>

      {task.blocked_reason && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-red-400">
          <Lock className="h-3 w-3 shrink-0" />
          <span className="truncate">{task.blocked_reason}</span>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="capitalize">
          {task.task_type}
        </Badge>
        {task.priority !== "none" && (
          <Badge variant="outline" className={cn("capitalize", PRIORITY_CLASSES[task.priority])}>
            {task.priority}
          </Badge>
        )}
        {task.deep_work && (
          <Badge variant="secondary" title="Deep work">
            <Zap className="h-3 w-3" />
          </Badge>
        )}
        {task.knowledge_value >= 4 && (
          <Badge variant="secondary" title="High knowledge value">
            <Brain className="h-3 w-3" />
          </Badge>
        )}
        {(task.risk_level === "high" || task.risk_level === "critical") && (
          <Badge variant="warning" title={`Risk: ${task.risk_level}`}>
            <AlertTriangle className="h-3 w-3" />
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        {task.estimated_minutes !== null && <span>{formatMinutes(task.estimated_minutes)}</span>}
        {task.deadline && (
          <span className={cn("flex items-center gap-1", overdue && "text-red-400")}>
            <CalendarDays className="h-3 w-3" />
            {formatDate(task.deadline)}
          </span>
        )}
        {task.learning_score > 0 && <span title="Knowledge score">K {Math.round(task.learning_score)}</span>}
      </div>
    </div>
  );
}
