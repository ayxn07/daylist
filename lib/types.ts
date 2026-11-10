export type TaskStatus = "pending" | "completed" | "deferred";

export interface Task {
  id: string;
  title: string;
  /** 24h "HH:MM" */
  startTime: string;
  /** minutes */
  duration: number;
  status: TaskStatus;
}

/** Shape returned by POST /api/schedule — a task before it gets an id/status. */
export interface ScheduledTaskDraft {
  title: string;
  startTime: string;
  duration: number;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATUSES: readonly TaskStatus[] = ["pending", "completed", "deferred"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isScheduledTaskDraft(value: unknown): value is ScheduledTaskDraft {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.startTime === "string" &&
    TIME_RE.test(value.startTime) &&
    typeof value.duration === "number" &&
    Number.isFinite(value.duration) &&
    value.duration > 0
  );
}

export function isTask(value: unknown): value is Task {
  return (
    isScheduledTaskDraft(value) &&
    isRecord(value) &&
    typeof value.id === "string" &&
    STATUSES.includes(value.status as TaskStatus)
  );
}

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
