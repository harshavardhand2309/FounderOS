/**
 * Sprint generation: propose a capacity-checked selection of tasks for next
 * week (AI when available, priority-greedy otherwise), let the user prune it,
 * then accept — which labels the tasks, promotes them to Ready, and records
 * the plan as a decision-log note.
 */

import { CalendarRange, Check, Flame, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAcceptSprint, useProposeSprint } from "@/api/hooks";
import type { SprintProposal, SprintTask } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Label, Progress, Skeleton } from "@/components/ui/misc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TYPE_LABELS } from "@/lib/display";
import { cn, formatMinutes } from "@/lib/utils";

function TaskRow({
  task,
  checked,
  onToggle,
}: {
  task: SprintTask;
  checked: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
        !checked && "opacity-50",
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(v) => onToggle(task.id, v === true)} />
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      {task.deep_work && <Flame className="h-3.5 w-3.5 shrink-0 text-warning" />}
      <Badge variant="outline" className="shrink-0 capitalize">
        {TYPE_LABELS[task.task_type] ?? task.task_type}
      </Badge>
      <span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground">
        {formatMinutes(task.estimated_minutes)}
      </span>
      <span className="w-8 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
        {Math.round(task.priority_score)}
      </span>
    </label>
  );
}

export function SprintDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const propose = useProposeSprint();
  const accept = useAcceptSprint();
  const [proposal, setProposal] = useState<SprintProposal | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setProposal(null);
      propose.mutate(
        {},
        {
          onSuccess: (result) => {
            setProposal(result);
            setSelected(new Set(result.tasks.map((t) => t.id)));
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(id: string, next: boolean) {
    setSelected((current) => {
      const copy = new Set(current);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  const allTasks = proposal ? [...proposal.tasks, ...proposal.stretch] : [];
  const selectedMinutes = allTasks
    .filter((t) => selected.has(t.id))
    .reduce((sum, t) => sum + t.estimated_minutes, 0);
  const overCapacity = proposal !== null && selectedMinutes > proposal.capacity_minutes;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Plan next sprint
          </DialogTitle>
        </DialogHeader>

        {propose.isPending && (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        )}

        {proposal && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">
                {proposal.week_start} → {proposal.week_end}
              </Badge>
              <Badge variant={proposal.source === "ai" ? "success" : "outline"}>
                {proposal.source === "ai" ? "AI proposal" : "priority heuristic"}
              </Badge>
              {proposal.theme && <Badge variant="outline">{proposal.theme}</Badge>}
            </div>

            {proposal.summary && (
              <p className="text-sm text-muted-foreground">{proposal.summary}</p>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={cn(overCapacity ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {formatMinutes(selectedMinutes)} selected
                  {overCapacity && " — over capacity"}
                </span>
                <span className="text-muted-foreground">
                  capacity {formatMinutes(proposal.capacity_minutes)} (15% buffer reserved)
                </span>
              </div>
              <Progress
                value={Math.min(100, (selectedMinutes / Math.max(1, proposal.capacity_minutes)) * 100)}
              />
            </div>

            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {proposal.tasks.map((task) => (
                <TaskRow key={task.id} task={task} checked={selected.has(task.id)} onToggle={toggle} />
              ))}
              {proposal.stretch.length > 0 && (
                <>
                  <Label className="pt-1.5">Stretch (pull in if the week goes well)</Label>
                  {proposal.stretch.map((task) => (
                    <TaskRow key={task.id} task={task} checked={selected.has(task.id)} onToggle={toggle} />
                  ))}
                </>
              )}
              {proposal.tasks.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nothing to plan — the backlog is empty.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={propose.isPending}
                onClick={() =>
                  propose.mutate(
                    {},
                    {
                      onSuccess: (result) => {
                        setProposal(result);
                        setSelected(new Set(result.tasks.map((t) => t.id)));
                      },
                    },
                  )
                }
              >
                <RefreshCw className="h-4 w-4" />
                Re-propose
              </Button>
              <Button
                size="sm"
                disabled={selected.size === 0 || accept.isPending}
                onClick={() =>
                  accept.mutate(
                    { week_start: proposal.week_start, task_ids: [...selected] },
                    { onSuccess: onClose },
                  )
                }
              >
                <Check className="h-4 w-4" />
                {accept.isPending ? "Accepting…" : `Accept ${selected.size} tasks`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
