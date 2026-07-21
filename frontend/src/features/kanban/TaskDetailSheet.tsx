import { Link2, Plus, Sparkles, Timer, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAddDependency,
  useAiStatus,
  useBoard,
  useDeleteTask,
  useGenerateSubtasks,
  useLogWork,
  useRemoveDependency,
  useTask,
  useUpdateChecklist,
  useUpdateTask,
} from "@/api/hooks";
import type { Checklist, Priority, TaskStatus, TaskType } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Label, Progress, Separator, Switch } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/display";
import { cn, formatMinutes } from "@/lib/utils";

const CHECKLIST_ITEMS: { key: keyof Omit<Checklist, "task_id">; label: string }[] = [
  { key: "read_docs", label: "Read official docs" },
  { key: "read_paper", label: "Read paper / source material" },
  { key: "summarized", label: "Wrote a summary" },
  { key: "explained_own_words", label: "Explained it in my own words" },
  { key: "compared_alternatives", label: "Compared alternatives" },
  { key: "implemented", label: "Implemented it" },
];

interface TaskDetailSheetProps {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailSheet({ taskId, onClose }: TaskDetailSheetProps) {
  const { data: task } = useTask(taskId);
  const { data: board } = useBoard(null);
  const updateTask = useUpdateTask();
  const updateChecklist = useUpdateChecklist();
  const addDependency = useAddDependency();
  const removeDependency = useRemoveDependency();
  const logWork = useLogWork();
  const deleteTask = useDeleteTask();
  const generateSubtasks = useGenerateSubtasks();
  const { data: aiStatus } = useAiStatus();

  const [description, setDescription] = useState("");
  const [workMinutes, setWorkMinutes] = useState("");
  const [dependencyPick, setDependencyPick] = useState("");

  useEffect(() => {
    setDescription(task?.description ?? "");
  }, [task?.id, task?.description]);

  const allTasks = useMemo(
    () => board?.columns.flatMap((c) => c.tasks) ?? [],
    [board],
  );
  const titleById = useMemo(
    () => new Map(allTasks.map((t) => [t.id, t.title])),
    [allTasks],
  );
  const dependencyCandidates = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.id !== taskId &&
          t.status !== "done" &&
          t.status !== "archived" &&
          !task?.dependencies.some((d) => d.depends_on_id === t.id),
      ),
    [allTasks, taskId, task?.dependencies],
  );

  if (!taskId || !task) return null;

  function patch(changes: Parameters<typeof updateTask.mutate>[0]["changes"]) {
    if (!taskId) return;
    updateTask.mutate({ id: taskId, changes });
  }

  return (
    <aside className="flex h-full w-[420px] shrink-0 flex-col border-l bg-card/60">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <span className="font-mono text-[11px] text-muted-foreground">
          score {Math.round(task.priority_score)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => {
              if (!window.confirm("Delete this task?")) return;
              deleteTask.mutate(taskId, {
                onSuccess: () => {
                  toast.success("Task deleted");
                  onClose();
                },
              });
            }}
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={onClose} aria-label="Close panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <Input
          key={task.id}
          defaultValue={task.title}
          className="border-transparent px-0 text-base font-semibold shadow-none focus-visible:border-input focus-visible:px-3"
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value && value !== task.title) patch({ title: value });
          }}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <div className="grid gap-1">
            <Label>Status</Label>
            <Select value={task.status} onValueChange={(v) => patch({ status: v as TaskStatus })}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Priority</Label>
            <Select value={task.priority} onValueChange={(v) => patch({ priority: v as Priority })}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Type</Label>
            <Select value={task.task_type} onValueChange={(v) => patch({ task_type: v as TaskType })}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Complexity</Label>
            <Select
              value={String(task.complexity)}
              onValueChange={(v) => patch({ complexity: Number(v) })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">Deep work</span>
          <Switch checked={task.deep_work} onCheckedChange={(v) => patch({ deep_work: v })} />
        </div>

        {/* Estimates */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <Label>Estimate ({task.estimate_source})</Label>
            <span className="text-[11px] text-muted-foreground">
              confidence {Math.round(task.estimate_confidence * 100)}%
            </span>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-md border text-center text-sm">
            <div className="border-r p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Best</div>
              <div>{task.estimate_optimistic !== null ? formatMinutes(task.estimate_optimistic) : "—"}</div>
            </div>
            <div className="border-r bg-muted/40 p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Likely</div>
              <div className="font-medium">
                {task.estimated_minutes !== null ? formatMinutes(task.estimated_minutes) : "—"}
              </div>
            </div>
            <div className="p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Worst</div>
              <div>
                {task.estimate_pessimistic !== null ? formatMinutes(task.estimate_pessimistic) : "—"}
              </div>
            </div>
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            Logged: {formatMinutes(task.actual_minutes)}
          </div>
        </section>

        {/* Work log */}
        <section className="flex items-end gap-2">
          <div className="grid flex-1 gap-1">
            <Label>Log work (minutes)</Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 50"
              value={workMinutes}
              onChange={(e) => setWorkMinutes(e.target.value)}
              className="h-8"
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!workMinutes || logWork.isPending}
            onClick={() => {
              const minutes = Number(workMinutes);
              if (!Number.isFinite(minutes) || minutes <= 0) return;
              logWork.mutate(
                { id: task.id, minutes, deep_work: task.deep_work },
                { onSuccess: () => setWorkMinutes("") },
              );
            }}
          >
            <Timer className="h-4 w-4" />
            Log
          </Button>
        </section>

        <Separator />

        {/* Description */}
        <section>
          <Label>Description</Label>
          <Textarea
            className="mt-1.5"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== task.description) patch({ description });
            }}
            placeholder="What does done look like?"
          />
        </section>

        {/* Learning checklist */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <Label>Knowledge score</Label>
            <span className="text-xs font-medium">{Math.round(task.learning_score)}/100</span>
          </div>
          <Progress value={task.learning_score} className="mb-2.5" />
          <div className="space-y-1.5">
            {CHECKLIST_ITEMS.map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={task.checklist?.[key] ?? false}
                  onCheckedChange={(checked) =>
                    updateChecklist.mutate({ taskId: task.id, changes: { [key]: checked === true } })
                  }
                />
                <span className={cn(task.checklist?.[key] && "text-muted-foreground line-through")}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </section>

        <Separator />

        {/* Dependencies */}
        <section>
          <Label>Blocked by</Label>
          <div className="mt-1.5 space-y-1.5">
            {task.dependencies.length === 0 && (
              <div className="text-xs text-muted-foreground">No dependencies</div>
            )}
            {task.dependencies.map((dep) => (
              <div
                key={dep.depends_on_id}
                className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {titleById.get(dep.depends_on_id) ?? dep.depends_on_id}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Remove dependency"
                  onClick={() =>
                    removeDependency.mutate({ taskId: task.id, dependsOnId: dep.depends_on_id })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Select value={dependencyPick} onValueChange={setDependencyPick}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="Add dependency…" />
                </SelectTrigger>
                <SelectContent>
                  {dependencyCandidates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!dependencyPick}
                onClick={() => {
                  addDependency.mutate({ taskId: task.id, dependsOnId: dependencyPick });
                  setDependencyPick("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Subtasks */}
        <section>
          <div className="flex items-center justify-between">
            <Label>Subtasks</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={generateSubtasks.isPending || aiStatus?.available === false}
              title={
                aiStatus?.available === false
                  ? "AI unavailable — start Ollama (qwen3) to enable"
                  : "Break this task down with AI"
              }
              onClick={() => generateSubtasks.mutate(task.id)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generateSubtasks.isPending ? "Generating…" : "AI breakdown"}
            </Button>
          </div>
          <div className="mt-1.5 space-y-1.5">
            {task.subtasks.length === 0 && (
              <div className="text-xs text-muted-foreground">No subtasks</div>
            )}
            {task.subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm"
              >
                <span className="truncate">{sub.title}</span>
                <Badge variant="outline" className="capitalize">
                  {STATUS_LABELS[sub.status]}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
