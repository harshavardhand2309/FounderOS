/** TanStack Query hooks — the only place components talk to the API from. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "./client";
import { queryKeys } from "./keys";
import type {
  Board,
  Checklist,
  DashboardCharts,
  DashboardOverview,
  DayPlan,
  Epic,
  Milestone,
  Note,
  NoteCreateInput,
  NoteUpdateInput,
  PlanEntry,
  PlanEntryStatus,
  Prefs,
  Project,
  ProjectCreateInput,
  ProjectOverview,
  ProjectUpdateInput,
  ReadingCreateInput,
  ReadingItem,
  ReadingUpdateInput,
  SearchHit,
  Task,
  TaskCreateInput,
  TaskDetail,
  TaskStatus,
  TaskType,
  TaskUpdateInput,
} from "./types";

function onApiError(error: unknown): void {
  const message = error instanceof ApiError ? error.detail : "Something went wrong";
  toast.error(message);
}

/** Invalidate everything task-derived (board, dashboard, planner previews). */
function invalidateTaskWorld(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: queryKeys.tasks });
  void qc.invalidateQueries({ queryKey: queryKeys.projectOverviews });
  void qc.invalidateQueries({ queryKey: ["dashboard"] });
  void qc.invalidateQueries({ queryKey: ["planner"] });
}

// Tasks ---------------------------------------------------------------------

export function useBoard(projectId: string | null): UseQueryResult<Board> {
  return useQuery({
    queryKey: queryKeys.board(projectId),
    queryFn: () =>
      api.get<Board>(`/tasks/board${projectId ? `?project_id=${projectId}` : ""}`),
  });
}

export function useTask(id: string | null): UseQueryResult<TaskDetail> {
  return useQuery({
    queryKey: queryKeys.task(id ?? "none"),
    queryFn: () => api.get<TaskDetail>(`/tasks/${id}`),
    enabled: id !== null,
  });
}

export function useCreateTask(): UseMutationResult<TaskDetail, unknown, TaskCreateInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post<TaskDetail>("/tasks", input),
    onSuccess: () => invalidateTaskWorld(qc),
    onError: onApiError,
  });
}

export function useUpdateTask(): UseMutationResult<
  TaskDetail,
  unknown,
  { id: string; changes: TaskUpdateInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => api.patch<TaskDetail>(`/tasks/${id}`, changes),
    onSuccess: () => invalidateTaskWorld(qc),
    onError: onApiError,
  });
}

export function useDeleteTask(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => invalidateTaskWorld(qc),
    onError: onApiError,
  });
}

export function useMoveTask(): UseMutationResult<
  Task,
  unknown,
  { id: string; status: TaskStatus; before_sequence?: number | null }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, before_sequence }) =>
      api.post<Task>(`/tasks/${id}/move`, { status, before_sequence: before_sequence ?? null }),
    onSuccess: () => invalidateTaskWorld(qc),
    onError: onApiError,
  });
}

export function useLogWork(): UseMutationResult<
  Task,
  unknown,
  { id: string; minutes: number; deep_work?: boolean; session_type?: TaskType; note?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => api.post<Task>(`/tasks/${id}/work`, body),
    onSuccess: (_task, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.task(id) });
      invalidateTaskWorld(qc);
    },
    onError: onApiError,
  });
}

export function useUpdateChecklist(): UseMutationResult<
  Checklist,
  unknown,
  { taskId: string; changes: Partial<Omit<Checklist, "task_id">> }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, changes }) =>
      api.patch<Checklist>(`/tasks/${taskId}/checklist`, changes),
    onSuccess: (_checklist, { taskId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskWorld(qc);
    },
    onError: onApiError,
  });
}

export function useAddDependency(): UseMutationResult<
  unknown,
  unknown,
  { taskId: string; dependsOnId: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnId }) =>
      api.post(`/tasks/${taskId}/dependencies`, { depends_on_id: dependsOnId }),
    onSuccess: (_result, { taskId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskWorld(qc);
    },
    onError: onApiError,
  });
}

export function useRemoveDependency(): UseMutationResult<
  void,
  unknown,
  { taskId: string; dependsOnId: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnId }) =>
      api.delete(`/tasks/${taskId}/dependencies/${dependsOnId}`),
    onSuccess: (_result, { taskId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskWorld(qc);
    },
    onError: onApiError,
  });
}

// Projects ------------------------------------------------------------------

export function useProjects(): UseQueryResult<Project[]> {
  return useQuery({ queryKey: queryKeys.projects, queryFn: () => api.get<Project[]>("/projects") });
}

export function useProjectOverviews(): UseQueryResult<ProjectOverview[]> {
  return useQuery({
    queryKey: queryKeys.projectOverviews,
    queryFn: () => api.get<ProjectOverview[]>("/projects/overviews"),
  });
}

export function useProjectOverview(id: string | null): UseQueryResult<ProjectOverview> {
  return useQuery({
    queryKey: [...queryKeys.project(id ?? "none"), "overview"],
    queryFn: () => api.get<ProjectOverview>(`/projects/${id}/overview`),
    enabled: id !== null,
  });
}

export function useCreateProject(): UseMutationResult<Project, unknown, ProjectCreateInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post<Project>("/projects", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.projects }),
    onError: onApiError,
  });
}

export function useUpdateProject(): UseMutationResult<
  Project,
  unknown,
  { id: string; changes: ProjectUpdateInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => api.patch<Project>(`/projects/${id}`, changes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects });
      void qc.invalidateQueries({ queryKey: queryKeys.projectOverviews });
    },
    onError: onApiError,
  });
}

export function useDeleteProject(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects });
      invalidateTaskWorld(qc);
    },
    onError: onApiError,
  });
}

export function useMilestones(projectId: string | null): UseQueryResult<Milestone[]> {
  return useQuery({
    queryKey: queryKeys.milestones(projectId ?? "none"),
    queryFn: () => api.get<Milestone[]>(`/projects/${projectId}/milestones`),
    enabled: projectId !== null,
  });
}

export function useAddMilestone(): UseMutationResult<
  Milestone,
  unknown,
  { projectId: string; name: string; description?: string; due_date?: string | null }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...body }) =>
      api.post<Milestone>(`/projects/${projectId}/milestones`, body),
    onSuccess: (_m, { projectId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.milestones(projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.projectOverviews });
    },
    onError: onApiError,
  });
}

export function useUpdateMilestone(): UseMutationResult<
  Milestone,
  unknown,
  { id: string; projectId: string; changes: Record<string, unknown> }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => api.patch<Milestone>(`/projects/milestones/${id}`, changes),
    onSuccess: (_m, { projectId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.milestones(projectId) });
      void qc.invalidateQueries({ queryKey: queryKeys.projectOverviews });
    },
    onError: onApiError,
  });
}

export function useEpics(projectId: string | null): UseQueryResult<Epic[]> {
  return useQuery({
    queryKey: queryKeys.epics(projectId ?? "none"),
    queryFn: () => api.get<Epic[]>(`/projects/${projectId}/epics`),
    enabled: projectId !== null,
  });
}

// Planner -------------------------------------------------------------------

export function usePlanToday(): UseQueryResult<DayPlan | null> {
  return useQuery({
    queryKey: queryKeys.planToday,
    queryFn: () => api.get<DayPlan | null>("/planner/today"),
  });
}

export function useGeneratePlan(): UseMutationResult<
  DayPlan,
  unknown,
  { plan_date?: string; available_minutes?: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post<DayPlan>("/planner/generate", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["planner"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: onApiError,
  });
}

export function useUpdatePlanEntry(): UseMutationResult<
  PlanEntry,
  unknown,
  { entryId: string; status?: PlanEntryStatus; locked?: boolean }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, ...body }) => api.patch<PlanEntry>(`/planner/entries/${entryId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["planner"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: onApiError,
  });
}

// Dashboard -----------------------------------------------------------------

export function useDashboardOverview(): UseQueryResult<DashboardOverview> {
  return useQuery({
    queryKey: queryKeys.dashboardOverview,
    queryFn: () => api.get<DashboardOverview>("/dashboard/overview"),
  });
}

export function useDashboardCharts(): UseQueryResult<DashboardCharts> {
  return useQuery({
    queryKey: queryKeys.dashboardCharts,
    queryFn: () => api.get<DashboardCharts>("/dashboard/charts"),
  });
}

// Notes ---------------------------------------------------------------------

export function useNotes(filters?: { kind?: string; project_id?: string; tag?: string }): UseQueryResult<Note[]> {
  const params = new URLSearchParams();
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.project_id) params.set("project_id", filters.project_id);
  if (filters?.tag) params.set("tag", filters.tag);
  const qs = params.toString();
  return useQuery({
    queryKey: [...queryKeys.notes, qs],
    queryFn: () => api.get<Note[]>(`/notes${qs ? `?${qs}` : ""}`),
  });
}

export function useNote(id: string | null): UseQueryResult<Note> {
  return useQuery({
    queryKey: queryKeys.note(id ?? "none"),
    queryFn: () => api.get<Note>(`/notes/${id}`),
    enabled: id !== null,
  });
}

export function useCreateNote(): UseMutationResult<Note, unknown, NoteCreateInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post<Note>("/notes", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.notes }),
    onError: onApiError,
  });
}

export function useUpdateNote(): UseMutationResult<
  Note,
  unknown,
  { id: string; changes: NoteUpdateInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => api.patch<Note>(`/notes/${id}`, changes),
    onSuccess: (_note, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.notes });
      void qc.invalidateQueries({ queryKey: queryKeys.note(id) });
    },
    onError: onApiError,
  });
}

export function useDeleteNote(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/notes/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.notes }),
    onError: onApiError,
  });
}

// Reading -------------------------------------------------------------------

export function useReadingList(): UseQueryResult<ReadingItem[]> {
  return useQuery({ queryKey: queryKeys.reading, queryFn: () => api.get<ReadingItem[]>("/reading") });
}

export function useDueReviews(): UseQueryResult<ReadingItem[]> {
  return useQuery({
    queryKey: queryKeys.dueReviews,
    queryFn: () => api.get<ReadingItem[]>("/reading/due-reviews"),
  });
}

export function useCreateReading(): UseMutationResult<ReadingItem, unknown, ReadingCreateInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post<ReadingItem>("/reading", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.reading }),
    onError: onApiError,
  });
}

export function useUpdateReading(): UseMutationResult<
  ReadingItem,
  unknown,
  { id: string; changes: ReadingUpdateInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => api.patch<ReadingItem>(`/reading/${id}`, changes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.reading });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: onApiError,
  });
}

export function useCompleteReview(): UseMutationResult<ReadingItem, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post<ReadingItem>(`/reading/${id}/complete-review`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.reading });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: onApiError,
  });
}

export function useDeleteReading(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/reading/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.reading }),
    onError: onApiError,
  });
}

// Search & prefs ------------------------------------------------------------

export function useSearch(query: string): UseQueryResult<SearchHit[]> {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => api.get<SearchHit[]>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 0,
    staleTime: 10_000,
  });
}

export function usePrefs(): UseQueryResult<Prefs> {
  return useQuery({ queryKey: queryKeys.prefs, queryFn: () => api.get<Prefs>("/prefs") });
}

export function useUpdatePrefs(): UseMutationResult<Prefs, unknown, Partial<Prefs>> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (changes) => api.put<Prefs>("/prefs", changes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.prefs });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: onApiError,
  });
}
