/**
 * TypeScript mirror of the backend DTOs (backend/app/presentation/schemas).
 * Vocabulary values match shared/constants.json.
 */

export type TaskStatus =
  | "inbox"
  | "backlog"
  | "ready"
  | "research"
  | "reading"
  | "coding"
  | "writing"
  | "review"
  | "blocked"
  | "done"
  | "archived";

export type TaskType =
  | "research"
  | "reading"
  | "coding"
  | "writing"
  | "review"
  | "planning"
  | "admin";

export type Priority = "urgent" | "high" | "medium" | "low" | "none";
export type EnergyLevel = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type EstimateSource = "manual" | "heuristic" | "historical" | "ai";
export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type ProjectPriority = "critical" | "high" | "medium" | "low";
export type NoteKind =
  | "research"
  | "summary"
  | "paper_review"
  | "book_notes"
  | "decision_log"
  | "adr"
  | "meeting"
  | "technical";
export type ReadingKind = "paper" | "book" | "article" | "docs" | "course" | "video";
export type ReadingStatus = "queued" | "reading" | "completed" | "abandoned";
export type PlanEntryKind = "focus" | "learning" | "break" | "buffer";
export type PlanEntryStatus = "planned" | "in_progress" | "done" | "skipped" | "moved";

export interface Task {
  id: string;
  title: string;
  description: string;
  project_id: string | null;
  epic_id: string | null;
  parent_id: string | null;
  status: TaskStatus;
  task_type: TaskType;
  priority: Priority;
  priority_score: number;
  difficulty: number;
  importance: number;
  complexity: number;
  knowledge_value: number;
  learning_score: number;
  estimated_minutes: number | null;
  estimate_optimistic: number | null;
  estimate_pessimistic: number | null;
  estimate_confidence: number;
  estimate_source: EstimateSource;
  actual_minutes: number;
  risk_level: RiskLevel;
  confidence: number;
  energy_required: EnergyLevel;
  deep_work: boolean;
  labels: string[];
  tags: string[];
  files: string[];
  links: string[];
  deadline: string | null;
  recurrence: string | null;
  blocked_reason: string | null;
  sequence: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Checklist {
  task_id: string;
  read_docs: boolean;
  read_paper: boolean;
  summarized: boolean;
  explained_own_words: boolean;
  compared_alternatives: boolean;
  implemented: boolean;
}

export interface Dependency {
  task_id: string;
  depends_on_id: string;
}

export interface TaskDetail extends Task {
  checklist: Checklist | null;
  dependencies: Dependency[];
  subtasks: Task[];
}

export interface BoardColumn {
  status: TaskStatus;
  tasks: Task[];
}

export interface Board {
  columns: BoardColumn[];
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  project_id?: string | null;
  epic_id?: string | null;
  parent_id?: string | null;
  status?: TaskStatus;
  task_type?: TaskType;
  priority?: Priority;
  difficulty?: number;
  importance?: number;
  complexity?: number;
  knowledge_value?: number;
  estimated_minutes?: number | null;
  risk_level?: RiskLevel;
  energy_required?: EnergyLevel;
  deep_work?: boolean;
  labels?: string[];
  tags?: string[];
  deadline?: string | null;
  recurrence?: string | null;
}

export type TaskUpdateInput = Partial<TaskCreateInput> & {
  blocked_reason?: string | null;
  files?: string[];
  links?: string[];
};

export interface Project {
  id: string;
  name: string;
  description: string;
  goals: string[];
  priority: ProjectPriority;
  status: ProjectStatus;
  color: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectOverview {
  project: Project;
  progress_pct: number;
  knowledge_progress_pct: number;
  total_tasks: number;
  done_tasks: number;
  open_tasks: number;
  blocked_tasks: number;
  estimated_remaining_minutes: number;
  completion_prediction: string | null;
  milestones_total: number;
  milestones_done: number;
}

export interface ProjectCreateInput {
  name: string;
  description?: string;
  goals?: string[];
  priority?: ProjectPriority;
  status?: ProjectStatus;
  color?: string;
  deadline?: string | null;
}

export type ProjectUpdateInput = Partial<ProjectCreateInput>;

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
}

export interface Epic {
  id: string;
  project_id: string;
  name: string;
  description: string;
  color: string;
}

export interface PlanEntry {
  id: string;
  task_id: string | null;
  kind: PlanEntryKind;
  session_type: TaskType | null;
  title: string;
  start_minute: number;
  duration_minutes: number;
  status: PlanEntryStatus;
  locked: boolean;
}

export interface DayPlan {
  id: string;
  plan_date: string;
  available_minutes: number;
  buffer_minutes: number;
  generated_at: string;
  notes: string;
  entries: PlanEntry[];
}

export interface Note {
  id: string;
  title: string;
  kind: NoteKind;
  content_md: string;
  content_json: string | null;
  task_id: string | null;
  project_id: string | null;
  tags: string[];
  source_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteCreateInput {
  title: string;
  kind?: NoteKind;
  content_md?: string;
  content_json?: string | null;
  task_id?: string | null;
  project_id?: string | null;
  tags?: string[];
}

export type NoteUpdateInput = Partial<NoteCreateInput>;

export interface ReadingItem {
  id: string;
  title: string;
  author: string;
  url: string;
  kind: ReadingKind;
  status: ReadingStatus;
  progress_pct: number;
  project_id: string | null;
  task_id: string | null;
  note_id: string | null;
  knowledge_score: number;
  understanding_score: number;
  implementation_score: number;
  next_review_at: string | null;
  review_interval_days: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingCreateInput {
  title: string;
  author?: string;
  url?: string;
  kind?: ReadingKind;
  status?: ReadingStatus;
  project_id?: string | null;
  task_id?: string | null;
}

export type ReadingUpdateInput = Partial<ReadingCreateInput> & {
  progress_pct?: number;
  knowledge_score?: number;
  understanding_score?: number;
  implementation_score?: number;
  next_review_at?: string | null;
  review_interval_days?: number;
};

export interface SearchHit {
  kind: "task" | "project" | "note" | "reading";
  id: string;
  title: string;
  snippet: string;
  score: number;
  project_id: string | null;
  status: string | null;
}

export interface Prefs {
  available_hours: number;
  day_start: string;
  deep_work_block_minutes: number;
  week_start_monday: boolean;
  theme: string;
  llm_enabled: boolean;
}

export interface TodaySummary {
  planned_focus_minutes: number;
  completed_focus_minutes: number;
  deep_work_minutes: number;
  learning_minutes: number;
  break_minutes: number;
  buffer_minutes: number;
  entries_total: number;
  entries_done: number;
}

export interface DashboardOverview {
  today: TodaySummary;
  total_remaining_minutes: number;
  burn_rate_minutes_per_day: number;
  projected_completion: string | null;
  overloaded_today: boolean;
  overload_ratio: number;
  open_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  done_this_week: number;
  velocity_tasks_per_day: number;
  avg_knowledge_score: number;
  reading_in_progress: number;
  reviews_due: number;
  focus_distribution: Record<string, number>;
}

export interface VelocityPoint {
  date: string;
  tasks_done: number;
  minutes: number;
}

export interface BurndownPoint {
  date: string;
  remaining_minutes: number;
}

export interface FocusSlice {
  type: TaskType;
  minutes: number;
}

export interface HeatmapPoint {
  date: string;
  minutes: number;
}

export interface DashboardCharts {
  velocity: VelocityPoint[];
  burndown: BurndownPoint[];
  focus_distribution: FocusSlice[];
  learning_heatmap: HeatmapPoint[];
}
