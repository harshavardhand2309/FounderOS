import { CalendarDays, CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useAddMilestone,
  useDeleteProject,
  useMilestones,
  useProjectOverview,
  useUpdateMilestone,
  useUpdateProject,
} from "@/api/hooks";
import type { ProjectStatus } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress, Skeleton } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatMinutes } from "@/lib/utils";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: overview, isLoading } = useProjectOverview(projectId ?? null);
  const { data: milestones } = useMilestones(projectId ?? null);
  const addMilestone = useAddMilestone();
  const updateMilestone = useUpdateMilestone();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [milestoneName, setMilestoneName] = useState("");

  if (isLoading || !overview || !projectId) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const { project } = overview;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
            {project.name}
          </h1>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={project.status}
            onValueChange={(v) =>
              updateProject.mutate({ id: projectId, changes: { status: v as ProjectStatus } })
            }
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/board?project=${projectId}`}>Open board</Link>
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Delete project"
            onClick={() => {
              if (!window.confirm(`Delete project "${project.name}"? Tasks are kept.`)) return;
              deleteProject.mutate(projectId, { onSuccess: () => navigate("/projects") });
            }}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{Math.round(overview.progress_pct)}%</div>
            <Progress value={overview.progress_pct} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Knowledge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {Math.round(overview.knowledge_progress_pct)}%
            </div>
            <Progress
              value={overview.knowledge_progress_pct}
              className="mt-2"
              indicatorClassName="bg-violet-500"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatMinutes(overview.estimated_remaining_minutes)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {overview.open_tasks} open · {overview.blocked_tasks} blocked
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Predicted done</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {overview.completion_prediction ? formatDate(overview.completion_prediction) : "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {overview.completion_prediction === null && "log work to enable prediction"}
            </div>
          </CardContent>
        </Card>
      </div>

      {project.goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {project.goals.map((goal) => (
              <div key={goal} className="flex items-center gap-2 text-sm">
                <Circle className="h-3 w-3 text-primary" />
                {goal}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>
            Milestones{" "}
            <span className="font-normal text-muted-foreground">
              {overview.milestones_done}/{overview.milestones_total}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {milestones?.map((milestone) => {
            const done = milestone.completed_at !== null;
            return (
              <button
                key={milestone.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                onClick={() =>
                  updateMilestone.mutate({
                    id: milestone.id,
                    projectId,
                    changes: { completed_at: done ? null : new Date().toISOString() },
                  })
                }
              >
                <span className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={done ? "text-muted-foreground line-through" : ""}>
                    {milestone.name}
                  </span>
                </span>
                {milestone.due_date && (
                  <Badge variant="outline">
                    <CalendarDays className="h-3 w-3" /> {formatDate(milestone.due_date)}
                  </Badge>
                )}
              </button>
            );
          })}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="New milestone…"
              className="h-8"
              value={milestoneName}
              onChange={(e) => setMilestoneName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && milestoneName.trim()) {
                  addMilestone.mutate({ projectId, name: milestoneName.trim() });
                  setMilestoneName("");
                }
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!milestoneName.trim()}
              onClick={() => {
                addMilestone.mutate({ projectId, name: milestoneName.trim() });
                setMilestoneName("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
