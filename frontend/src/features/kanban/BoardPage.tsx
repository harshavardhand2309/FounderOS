import { useSearchParams } from "react-router-dom";
import { useBoard, useProjects } from "@/api/hooks";
import { Skeleton } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanBoard } from "@/features/kanban/KanbanBoard";
import { TaskDetailSheet } from "@/features/kanban/TaskDetailSheet";

export function BoardPage() {
  const [params, setParams] = useSearchParams();
  const projectFilter = params.get("project");
  const openTaskId = params.get("task");

  const { data: board, isLoading } = useBoard(projectFilter);
  const { data: projects } = useProjects();

  function setParam(key: string, value: string | null) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-2">
          <h1 className="text-sm font-semibold">Board</h1>
          <Select
            value={projectFilter ?? "all"}
            onValueChange={(v) => setParam("project", v === "all" ? null : v)}
          >
            <SelectTrigger className="h-7 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-h-0 flex-1">
          {isLoading || !board ? (
            <div className="flex gap-3 p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-96 w-64" />
              ))}
            </div>
          ) : (
            <KanbanBoard board={board} onOpenTask={(id) => setParam("task", id)} />
          )}
        </div>
      </div>
      <TaskDetailSheet taskId={openTaskId} onClose={() => setParam("task", null)} />
    </div>
  );
}
