import { AlertTriangle, CalendarDays, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCreateProject, useProjectOverviews } from "@/api/hooks";
import type { ProjectPriority } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Progress, Skeleton } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMinutes } from "@/lib/utils";

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const COLORS = ["#5e6ad2", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export function ProjectsPage() {
  const { data: overviews, isLoading } = useProjectOverviews();
  const createProject = useCreateProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ProjectPriority>("medium");
  const [goals, setGoals] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(COLORS[0] ?? "#5e6ad2");

  function submit() {
    if (!name.trim()) return;
    createProject.mutate(
      {
        name: name.trim(),
        description,
        priority,
        color,
        goals: goals
          .split("\n")
          .map((g) => g.trim())
          .filter(Boolean),
        deadline: deadline || null,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setName("");
          setDescription("");
          setGoals("");
          setDeadline("");
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Progress, knowledge growth and completion predictions per project.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      )}

      {overviews && overviews.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No projects yet. Create one to start organizing work.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {overviews?.map((o) => (
          <Link key={o.project.id} to={`/projects/${o.project.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: o.project.color }}
                    />
                    {o.project.name}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {o.blocked_tasks > 0 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3" /> {o.blocked_tasks} blocked
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {o.project.priority}
                    </Badge>
                  </div>
                </div>
                {o.project.description && (
                  <CardDescription className="line-clamp-2">{o.project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span>{Math.round(o.progress_pct)}%</span>
                  </div>
                  <Progress value={o.progress_pct} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Knowledge</span>
                    <span>{Math.round(o.knowledge_progress_pct)}%</span>
                  </div>
                  <Progress value={o.knowledge_progress_pct} indicatorClassName="bg-violet-500" />
                </div>
                <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span>
                    {o.done_tasks}/{o.total_tasks} tasks
                  </span>
                  <span>{formatMinutes(o.estimated_remaining_minutes)} left</span>
                  {o.completion_prediction && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      ETA {formatDate(o.completion_prediction)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              autoFocus
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              placeholder="Description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Textarea
              placeholder={"Goals (one per line)"}
              rows={3}
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
            <div className="grid gap-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: c === color ? "white" : "transparent" }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createProject.isPending}>
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
