/** Presentation vocabulary for domain values: labels, colors, ordering. */

import type { Priority, TaskStatus, TaskType } from "@/api/types";

export const STATUS_ORDER: TaskStatus[] = [
  "inbox",
  "backlog",
  "ready",
  "research",
  "reading",
  "coding",
  "writing",
  "review",
  "blocked",
  "done",
  "archived",
];

/** Columns shown on the kanban board by default (archived is hidden). */
export const BOARD_STATUSES: TaskStatus[] = STATUS_ORDER.filter((s) => s !== "archived");

export const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: "Inbox",
  backlog: "Backlog",
  ready: "Ready",
  research: "Research",
  reading: "Reading",
  coding: "Coding",
  writing: "Writing",
  review: "Review",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived",
};

export const STATUS_DOT_CLASSES: Record<TaskStatus, string> = {
  inbox: "bg-zinc-400",
  backlog: "bg-zinc-500",
  ready: "bg-sky-400",
  research: "bg-violet-400",
  reading: "bg-fuchsia-400",
  coding: "bg-blue-400",
  writing: "bg-teal-400",
  review: "bg-amber-400",
  blocked: "bg-red-500",
  done: "bg-emerald-500",
  archived: "bg-zinc-600",
};

export const TYPE_LABELS: Record<TaskType, string> = {
  research: "Research",
  reading: "Reading",
  coding: "Coding",
  writing: "Writing",
  review: "Review",
  planning: "Planning",
  admin: "Admin",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No priority",
};

export const PRIORITY_CLASSES: Record<Priority, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-sky-400",
  none: "text-muted-foreground",
};

export function minutesToLabel(startMinute: number): string {
  const h = Math.floor(startMinute / 60) % 24;
  const m = startMinute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function scoreTone(score: number): string {
  if (score >= 70) return "text-red-400";
  if (score >= 45) return "text-amber-400";
  return "text-muted-foreground";
}
