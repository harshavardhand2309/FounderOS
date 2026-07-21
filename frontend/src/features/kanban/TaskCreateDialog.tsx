import { useState } from "react";
import { toast } from "sonner";
import { useCreateTask, useProjects } from "@/api/hooks";
import type { Priority, TaskStatus, TaskType } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Switch } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/display";

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string | null;
  defaultStatus?: TaskStatus;
}

const SCALE = [1, 2, 3, 4, 5] as const;

export function TaskCreateDialog({
  open,
  onOpenChange,
  defaultProjectId = null,
  defaultStatus = "inbox",
}: TaskCreateDialogProps) {
  const { data: projects } = useProjects();
  const createTask = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | "none">(defaultProjectId ?? "none");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [taskType, setTaskType] = useState<TaskType>("coding");
  const [priority, setPriority] = useState<Priority>("none");
  const [complexity, setComplexity] = useState(3);
  const [importance, setImportance] = useState(3);
  const [knowledgeValue, setKnowledgeValue] = useState(2);
  const [deepWork, setDeepWork] = useState(false);
  const [deadline, setDeadline] = useState("");

  function reset() {
    setTitle("");
    setDescription("");
    setStatus(defaultStatus);
    setTaskType("coding");
    setPriority("none");
    setComplexity(3);
    setImportance(3);
    setKnowledgeValue(2);
    setDeepWork(false);
    setDeadline("");
  }

  function submit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    createTask.mutate(
      {
        title: title.trim(),
        description,
        project_id: projectId === "none" ? null : projectId,
        status,
        task_type: taskType,
        priority,
        complexity,
        importance,
        knowledge_value: knowledgeValue,
        deep_work: deepWork,
        deadline: deadline ? new Date(`${deadline}T17:00:00`).toISOString() : null,
      },
      {
        onSuccess: (task) => {
          toast.success(`Created "${task.title}" — estimated ${task.estimated_minutes ?? "?"}m`);
          reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            autoFocus
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
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
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                <SelectTrigger>
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
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
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
            <div className="grid gap-1.5">
              <Label>Complexity (drives estimate)</Label>
              <Select value={String(complexity)} onValueChange={(v) => setComplexity(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCALE.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "(trivial)" : n === 5 ? "(very complex)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Business impact</Label>
              <Select value={String(importance)} onValueChange={(v) => setImportance(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCALE.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "(minor)" : n === 5 ? "(critical)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Knowledge value</Label>
              <Select
                value={String(knowledgeValue)}
                onValueChange={(v) => setKnowledgeValue(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCALE.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 5 ? "(core learning)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Deep work</div>
              <div className="text-xs text-muted-foreground">
                Requires uninterrupted focus; scheduled in long blocks
              </div>
            </div>
            <Switch checked={deepWork} onCheckedChange={setDeepWork} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createTask.isPending}>
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
