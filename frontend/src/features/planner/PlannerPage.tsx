/**
 * My Day — the auto-generated schedule. The user sets available hours,
 * FounderOS builds the day: focus sessions, breaks, learning slot, buffer.
 */

import {
  BookOpen,
  CalendarPlus,
  Check,
  ClipboardCheck,
  Coffee,
  Flame,
  Lock,
  LockOpen,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  useAiStatus,
  useDailyReview,
  useGeneratePlan,
  usePlanToday,
  usePrefs,
  useUpdatePlanEntry,
  type DailyReview,
} from "@/api/hooks";
import type { PlanEntry } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Skeleton } from "@/components/ui/misc";
import { minutesToLabel } from "@/lib/display";
import { cn, formatMinutes } from "@/lib/utils";

function entryIcon(entry: PlanEntry) {
  if (entry.kind === "break") return Coffee;
  if (entry.kind === "buffer") return Shield;
  if (entry.kind === "learning") return BookOpen;
  return entry.title.startsWith("Deep work") ? Flame : Check;
}

function EntryRow({ entry }: { entry: PlanEntry }) {
  const updateEntry = useUpdatePlanEntry();
  const Icon = entryIcon(entry);
  const isWork = entry.kind === "focus" || entry.kind === "learning";
  const done = entry.status === "done";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors",
        done && "opacity-60",
        entry.kind === "break" && "border-dashed bg-transparent",
        entry.kind === "buffer" && "border-dashed bg-transparent text-muted-foreground",
      )}
    >
      <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
        {minutesToLabel(entry.start_minute)}
      </span>
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          entry.kind === "focus" && entry.title.startsWith("Deep work")
            ? "text-warning"
            : entry.kind === "learning"
              ? "text-violet-400"
              : "text-muted-foreground",
        )}
      />
      <span className={cn("min-w-0 flex-1 truncate text-sm", done && "line-through")}>
        {entry.title}
      </span>
      {entry.session_type && (
        <Badge variant="outline" className="capitalize">
          {entry.session_type}
        </Badge>
      )}
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatMinutes(entry.duration_minutes)}
      </span>
      {isWork && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="iconSm"
            aria-label={entry.locked ? "Unlock entry" : "Lock entry"}
            title="Locked entries survive replans"
            onClick={() => updateEntry.mutate({ entryId: entry.id, locked: !entry.locked })}
          >
            {entry.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant={done ? "secondary" : "ghost"}
            size="iconSm"
            aria-label="Mark done"
            onClick={() =>
              updateEntry.mutate({ entryId: entry.id, status: done ? "planned" : "done" })
            }
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {isWork && entry.locked && (
        <Lock className="h-3 w-3 shrink-0 text-muted-foreground group-hover:hidden" />
      )}
    </div>
  );
}

export function PlannerPage() {
  const { data: plan, isLoading } = usePlanToday();
  const { data: prefs } = usePrefs();
  const { data: aiStatus } = useAiStatus();
  const generatePlan = useGeneratePlan();
  const dailyReview = useDailyReview();
  const [hours, setHours] = useState("");
  const [review, setReview] = useState<DailyReview | null>(null);

  useEffect(() => {
    if (prefs && hours === "") setHours(String(prefs.available_hours));
  }, [prefs, hours]);

  const workMinutes =
    plan?.entries
      .filter((e) => e.kind === "focus" || e.kind === "learning")
      .reduce((sum, e) => sum + e.duration_minutes, 0) ?? 0;
  const deepMinutes =
    plan?.entries
      .filter((e) => e.kind === "focus" && e.title.startsWith("Deep work"))
      .reduce((sum, e) => sum + e.duration_minutes, 0) ?? 0;
  const doneMinutes =
    plan?.entries
      .filter((e) => (e.kind === "focus" || e.kind === "learning") && e.status === "done")
      .reduce((sum, e) => sum + e.duration_minutes, 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My Day</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="grid gap-1">
            <Label>Available hours</Label>
            <Input
              type="number"
              min={1}
              max={16}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="h-8 w-24"
            />
          </div>
          <Button
            size="sm"
            disabled={generatePlan.isPending}
            onClick={() =>
              generatePlan.mutate({
                available_minutes: Math.round(Number(hours || "8") * 60),
              })
            }
          >
            {plan ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {plan ? "Replan" : "Plan my day"}
          </Button>
          {aiStatus?.available && (
            <Button
              size="sm"
              variant="outline"
              disabled={dailyReview.isPending}
              onClick={() => dailyReview.mutate(undefined, { onSuccess: setReview })}
            >
              <ClipboardCheck className="h-4 w-4" />
              {dailyReview.isPending ? "Reviewing…" : "Daily review"}
            </Button>
          )}
          {plan && (
            <Button size="sm" variant="outline" asChild title="Export today's plan to your calendar">
              <a href={`/api/planner/${plan.plan_date}/calendar.ics`} download>
                <CalendarPlus className="h-4 w-4" />
                .ics
              </a>
            </Button>
          )}
        </div>
      </div>

      <Dialog open={review !== null} onOpenChange={(open) => !open && setReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daily review</DialogTitle>
          </DialogHeader>
          {review && (
            <div className="space-y-4 text-sm">
              <p>{review.summary}</p>
              {review.wins.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-success">Wins</div>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {review.wins.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {review.concerns.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-warning">Concerns</div>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {review.concerns.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {review.tomorrow_focus.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-primary">Tomorrow</div>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {review.tomorrow_focus.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {plan && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {formatMinutes(doneMinutes)} / {formatMinutes(workMinutes)} focus
          </Badge>
          <Badge variant="secondary">
            <Flame className="h-3 w-3 text-warning" /> {formatMinutes(deepMinutes)} deep work
          </Badge>
          <Badge variant="secondary">
            <Shield className="h-3 w-3" /> {formatMinutes(plan.buffer_minutes)} buffer
          </Badge>
          {plan.notes && <Badge variant="warning">{plan.notes}</Badge>}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}

      {!isLoading && !plan && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div className="text-sm font-medium">No plan for today yet</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Tell FounderOS how many hours you have and it will schedule your highest-priority
              work with breaks, deep-work blocks, learning time and a safety buffer.
            </p>
            <Button
              onClick={() =>
                generatePlan.mutate({ available_minutes: Math.round(Number(hours || "8") * 60) })
              }
              disabled={generatePlan.isPending}
            >
              <Sparkles className="h-4 w-4" /> Plan my day
            </Button>
          </CardContent>
        </Card>
      )}

      {plan && (
        <div className="space-y-1.5">
          {plan.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
