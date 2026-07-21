/** Central query-key registry so invalidation stays consistent. */

export const queryKeys = {
  tasks: ["tasks"] as const,
  board: (projectId: string | null) => ["tasks", "board", projectId ?? "all"] as const,
  task: (id: string) => ["tasks", "detail", id] as const,
  projects: ["projects"] as const,
  projectOverviews: ["projects", "overviews"] as const,
  project: (id: string) => ["projects", "detail", id] as const,
  milestones: (projectId: string) => ["projects", projectId, "milestones"] as const,
  epics: (projectId: string) => ["projects", projectId, "epics"] as const,
  planToday: ["planner", "today"] as const,
  plan: (date: string) => ["planner", date] as const,
  dashboardOverview: ["dashboard", "overview"] as const,
  dashboardCharts: ["dashboard", "charts"] as const,
  notes: ["notes"] as const,
  note: (id: string) => ["notes", id] as const,
  reading: ["reading"] as const,
  dueReviews: ["reading", "due-reviews"] as const,
  search: (q: string) => ["search", q] as const,
  prefs: ["prefs"] as const,
};
