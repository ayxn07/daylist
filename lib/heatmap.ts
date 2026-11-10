export const HEATMAP_WEEKS = 12;
export const HEATMAP_DAYS = 7;
export const HISTORY_DAYS = 60;

export interface HeatmapCell {
  key: string;
  date: Date;
  count: number;
  isToday: boolean;
  isFuture: boolean;
}

const DAY_MS = 86_400_000;

function dayKey(d: Date): string {
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG so dummy history is stable across renders/reloads. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dummyCount(key: string, weekday: number): number {
  const rand = mulberry32(hashString(key));
  if (rand() < 0.18) return 0;
  const weekend = weekday === 0 || weekday === 6;
  return 1 + Math.floor(rand() * (weekend ? 4 : 9));
}

/**
 * 84 cells (12 weeks × 7 days), column-major, Sunday-first rows.
 * The last column holds the current week; the past 60 days get dummy data
 * and today's cell reflects the live completed count.
 */
export function buildHeatmap(today: Date, todayCompleted: number): HeatmapCell[] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - end.getDay() - (HEATMAP_WEEKS - 1) * HEATMAP_DAYS);

  const cells: HeatmapCell[] = [];
  for (let i = 0; i < HEATMAP_WEEKS * HEATMAP_DAYS; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const daysAgo = Math.round((end.getTime() - date.getTime()) / DAY_MS);
    const key = dayKey(date);

    let count = 0;
    if (daysAgo === 0) count = todayCompleted;
    else if (daysAgo > 0 && daysAgo < HISTORY_DAYS) count = dummyCount(key, date.getDay());

    cells.push({ key, date, count, isToday: daysAgo === 0, isFuture: daysAgo < 0 });
  }
  return cells;
}

export function levelClass(count: number): string {
  if (count <= 0) return "bg-gray-800";
  if (count <= 2) return "bg-green-900/50";
  if (count <= 5) return "bg-green-600";
  return "bg-green-400";
}
