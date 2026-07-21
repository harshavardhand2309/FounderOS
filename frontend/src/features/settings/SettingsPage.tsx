import { Play } from "lucide-react";
import { useAutomationStatus, usePrefs, useRunCompile, useUpdatePrefs } from "@/api/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Skeleton, Switch } from "@/components/ui/misc";

export function SettingsPage() {
  const { data: prefs, isLoading } = usePrefs();
  const { data: automation } = useAutomationStatus();
  const updatePrefs = useUpdatePrefs();
  const runCompile = useRunCompile();

  if (isLoading || !prefs) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Everything is stored locally — FounderOS works fully offline.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planning</CardTitle>
          <CardDescription>Defaults the daily planner uses to build your schedule.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Available hours per day</Label>
            <Input
              type="number"
              min={1}
              max={16}
              step={0.5}
              defaultValue={prefs.available_hours}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value) && value > 0 && value !== prefs.available_hours) {
                  updatePrefs.mutate({ available_hours: value });
                }
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Day starts at</Label>
            <Input
              type="time"
              defaultValue={prefs.day_start}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== prefs.day_start) {
                  updatePrefs.mutate({ day_start: e.target.value });
                }
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Deep work block (minutes)</Label>
            <Input
              type="number"
              min={25}
              max={240}
              step={5}
              defaultValue={prefs.deep_work_block_minutes}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value) && value !== prefs.deep_work_block_minutes) {
                  updatePrefs.mutate({ deep_work_block_minutes: value });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI</CardTitle>
          <CardDescription>
            FounderOS uses a local Ollama model (default: qwen3) when available. All features keep
            working without it — estimation and prioritization fall back to deterministic
            heuristics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Enable AI assistance</div>
              <div className="text-xs text-muted-foreground">
                Subtask generation, planning reviews, risk analysis, quizzes
              </div>
            </div>
            <Switch
              checked={prefs.llm_enabled}
              onCheckedChange={(v) => updatePrefs.mutate({ llm_enabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Morning compile</CardTitle>
          <CardDescription>
            Every morning FounderOS rolls unfinished work forward, scans your configured
            workspaces, derives tasks (testing, bug fixes, docs to review, development) onto each
            project's board with estimates, and builds your day timeline. Configure workspaces via
            the <code className="rounded bg-muted px-1">FOUNDEROS_WORKSPACES</code> env var.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={automation?.morning_compile_enabled ? "success" : "outline"}>
              {automation?.morning_compile_enabled ? "enabled" : "disabled"}
            </Badge>
            <Badge variant="outline">
              daily at {automation?.morning_compile_time ?? "06:00"} {automation?.timezone ?? ""}
            </Badge>
            <Badge variant="outline">
              model: {automation?.llm_provider ?? "…"}/{automation?.llm_model ?? "…"}
            </Badge>
          </div>
          {automation && automation.workspaces.length > 0 ? (
            <div className="space-y-1">
              {automation.workspaces.map((ws) => (
                <div key={ws} className="rounded-md border px-2.5 py-1.5 font-mono text-xs">
                  {ws}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No workspaces configured — the compile still rolls work over and rebuilds your plan.
            </p>
          )}
          <Button
            size="sm"
            variant="secondary"
            disabled={runCompile.isPending}
            onClick={() => runCompile.mutate()}
          >
            <Play className="h-4 w-4" />
            {runCompile.isPending ? "Compiling…" : "Run compile now"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyboard shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[
            ["⌘K / Ctrl+K", "Command palette & search"],
            ["C", "New task"],
            ["Esc", "Close panels"],
          ].map(([keys, action]) => (
            <div key={keys} className="flex items-center justify-between">
              <span className="text-muted-foreground">{action}</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">{keys}</kbd>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
