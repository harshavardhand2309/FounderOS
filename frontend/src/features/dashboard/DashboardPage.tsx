import {
  AlertTriangle,
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  Flame,
  Lock,
  Timer,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboardCharts, useDashboardOverview, useProjectOverviews } from "@/api/hooks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, Skeleton } from "@/components/ui/misc";
import { TYPE_LABELS } from "@/lib/display";
import { formatDate, formatMinutes } from "@/lib/utils";
import type { TaskType } from "@/api/types";

const CHART_PRIMARY = "hsl(var(--primary))";
const GRID_STROKE = "hsl(var(--border))";
const TICK_STYLE = { fill: "hsl(var(--muted-foreground))", fontSize: 10 };
// Sequential ramp for the learning heatmap: one violet hue, light -> dark.
const HEAT_STEPS = ["#2a2438", "#4c3a78", "#6d4fb0", "#8b5cf6", "#b491ff"];

function heatColor(minutes: number): string {
  if (minutes <= 0) return "hsl(var(--muted))";
  const idx = minutes <= 30 ? 1 : minutes <= 60 ? 2 : minutes <= 120 ? 3 : 4;
  return HEAT_STEPS[idx] ?? HEAT_STEPS[4] ?? "#8b5cf6";
}

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
  format: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{format(value)}</div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  hint?: string;
  tone?: "warn" | "ok";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div
          className={
            tone === "warn"
              ? "mt-1 text-2xl font-semibold text-warning"
              : tone === "ok"
                ? "mt-1 text-2xl font-semibold text-success"
                : "mt-1 text-2xl font-semibold"
          }
        >
          {value}
        </div>
        {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data: overview, isLoading } = useDashboardOverview();
  const { data: charts } = useDashboardCharts();
  const { data: projects } = useProjectOverviews();

  if (isLoading || !overview) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const focusEntries = Object.entries(overview.focus_distribution) as [TaskType, number][];
  const focusData = focusEntries
    .map(([type, minutes]) => ({ type: TYPE_LABELS[type] ?? type, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  // Group heatmap days into columns of 7 for a GitHub-style grid.
  const heatmap = charts?.learning_heatmap ?? [];
  const heatWeeks: (typeof heatmap)[] = [];
  for (let i = 0; i < heatmap.length; i += 7) heatWeeks.push(heatmap.slice(i, i + 7));

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {overview.overloaded_today
              ? `Today is overloaded (${Math.round(overview.overload_ratio * 100)}% of capacity) — excess moves forward automatically.`
              : "Your operating picture across every project."}
          </p>
        </div>
        {overview.reviews_due > 0 && (
          <Link to="/learning">
            <Badge variant="warning">
              <BookOpen className="h-3 w-3" /> {overview.reviews_due} review
              {overview.reviews_due > 1 ? "s" : ""} due
            </Badge>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Today's plan"
          value={`${formatMinutes(overview.today.completed_focus_minutes)} / ${formatMinutes(overview.today.planned_focus_minutes)}`}
          hint={`${overview.today.entries_done}/${overview.today.entries_total} sessions done`}
        />
        <StatCard
          icon={Flame}
          label="Deep work today"
          value={formatMinutes(overview.today.deep_work_minutes)}
          hint={`${formatMinutes(overview.today.learning_minutes)} learning`}
        />
        <StatCard
          icon={Timer}
          label="Remaining (all projects)"
          value={formatMinutes(overview.total_remaining_minutes)}
          hint={
            overview.projected_completion
              ? `projected done ${formatDate(overview.projected_completion)}`
              : "log work to project completion"
          }
        />
        <StatCard
          icon={Brain}
          label="Knowledge score"
          value={`${Math.round(overview.avg_knowledge_score)}`}
          hint="avg across knowledge tasks"
        />
        <StatCard
          icon={CheckCircle2}
          label="Done this week"
          value={String(overview.done_this_week)}
          hint={`velocity ${overview.velocity_tasks_per_day}/day`}
          tone="ok"
        />
        <StatCard icon={Lock} label="Blocked" value={String(overview.blocked_tasks)} />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={String(overview.overdue_tasks)}
          tone={overview.overdue_tasks > 0 ? "warn" : undefined}
        />
        <StatCard
          icon={BookOpen}
          label="Reading in flight"
          value={String(overview.reading_in_progress)}
          hint={`${overview.reviews_due} reviews due`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task velocity — 30 days</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.velocity ?? []} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={TICK_STYLE}
                  tickFormatter={(d: string) => formatDate(d)}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--accent))" }}
                  content={<ChartTooltip format={(v) => `${v} task${v === 1 ? "" : "s"} done`} />}
                />
                <Bar dataKey="tasks_done" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Burndown — remaining estimated work</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.burndown ?? []} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="burn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={TICK_STYLE}
                  tickFormatter={(d: string) => formatDate(d)}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  tick={TICK_STYLE}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 60)}h`}
                />
                <Tooltip content={<ChartTooltip format={(v) => `${formatMinutes(v)} remaining`} />} />
                <Area
                  type="monotone"
                  dataKey="remaining_minutes"
                  stroke={CHART_PRIMARY}
                  strokeWidth={2}
                  fill="url(#burn)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus distribution — 14 days</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {focusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Log work sessions to see where your time goes.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={focusData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: -8, bottom: 0 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={TICK_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatMinutes(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="type"
                    tick={{ ...TICK_STYLE, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--accent))" }}
                    content={<ChartTooltip format={(v) => formatMinutes(v)} />}
                  />
                  <Bar dataKey="minutes" fill={CHART_PRIMARY} radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning heatmap — research & reading minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-[3px] overflow-x-auto pb-1">
              {heatWeeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date}: ${formatMinutes(day.minutes)}`}
                      className="h-3 w-3 rounded-[3px]"
                      style={{ backgroundColor: heatColor(day.minutes) }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              Less
              {HEAT_STEPS.slice(1).map((c) => (
                <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: c }} />
              ))}
              More
            </div>
          </CardContent>
        </Card>
      </div>

      {projects && projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.map((o) => (
              <Link
                key={o.project.id}
                to={`/projects/${o.project.id}`}
                className="flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-accent"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.project.color }} />
                <span className="w-44 truncate text-sm">{o.project.name}</span>
                <Progress value={o.progress_pct} className="flex-1" />
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {Math.round(o.progress_pct)}%
                </span>
                <span className="w-20 text-right text-xs text-muted-foreground">
                  {formatMinutes(o.estimated_remaining_minutes)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
