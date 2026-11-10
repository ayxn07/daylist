import type { Task } from "./types";

export const DAY_START_HOUR = 8; // 8 AM
export const DAY_END_HOUR = 20; // 8 PM (end of last slot)
export const SLOT_MINUTES = 60;

/** Start hour of every slot: 8, 9, … 19 */
export const HOURS: readonly number[] = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, i) => DAY_START_HOUR + i,
);

const pad = (n: number) => n.toString().padStart(2, "0");

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(total, 23 * 60 + 59));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function hourOf(time: string): number {
  return Math.floor(toMinutes(time) / 60);
}

/** Slot a task is rendered in — tasks outside the visible day clamp to the edges. */
export function slotHourOf(time: string): number {
  return Math.min(Math.max(hourOf(time), DAY_START_HOUR), DAY_END_HOUR - 1);
}

export function formatHour(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${suffix}`;
}

export function formatTime(time: string): string {
  const total = toMinutes(time);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function endTimeOf(task: Pick<Task, "startTime" | "duration">): string {
  return fromMinutes(toMinutes(task.startTime) + task.duration);
}

/** Deferred tasks live in the tray, not on the timeline. */
export function isOnTimeline(task: Task): boolean {
  return task.status !== "deferred";
}

function coversRange(task: Task, start: number, end: number): boolean {
  const s = toMinutes(task.startTime);
  return s < end && s + task.duration > start;
}

export function isSlotFree(tasks: readonly Task[], hour: number, ignoreId?: string): boolean {
  const start = hour * SLOT_MINUTES;
  const end = start + SLOT_MINUTES;
  return !tasks.some(
    (t) => t.id !== ignoreId && isOnTimeline(t) && coversRange(t, start, end),
  );
}

/**
 * Earliest start time where `duration` fits into consecutive empty hour slots.
 * Falls back to the first single empty slot; returns null if the day is full.
 */
export function findEarliestSlot(
  tasks: readonly Task[],
  duration: number,
  ignoreId?: string,
): string | null {
  const needed = Math.max(1, Math.ceil(duration / SLOT_MINUTES));

  for (const hour of HOURS) {
    if (hour + needed > DAY_END_HOUR) break;
    let fits = true;
    for (let h = hour; h < hour + needed; h++) {
      if (!isSlotFree(tasks, h, ignoreId)) {
        fits = false;
        break;
      }
    }
    if (fits) return fromMinutes(hour * 60);
  }

  const single = HOURS.find((h) => isSlotFree(tasks, h, ignoreId));
  return single === undefined ? null : fromMinutes(single * 60);
}
