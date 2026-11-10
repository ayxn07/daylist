import { DAY_END_HOUR, fromMinutes } from "./time";
import type { ScheduledTaskDraft } from "./types";

/**
 * Mock "LLM" scheduler. Deterministic heuristics stand in for a model call:
 * split the brain dump into intents, infer durations and time-of-day hints,
 * then lay out 3 non-overlapping tasks with sensible start times.
 *
 * To go live, replace `mockLlmSchedule` with a model call that returns the same
 * ScheduledTaskDraft[] shape — the route and client already validate it.
 */

export const DUMMY_BRAIN_DUMP =
  "finish the pitch deck slides, reply to investor emails and quick call with mentor about the demo, gym in the evening";

const TASK_COUNT = 3;
const DEFAULT_START = 9 * 60;
const MOCK_LATENCY_MS = 650;

const DURATION_HOURS_RE = /\b(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i;
const DURATION_MINS_RE = /\b(?:for\s+)?(\d+)\s*(?:m|min|mins|minute|minutes)\b/i;
const CLOCK_RE = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const PART_OF_DAY_RE = /\b(?:in the |this |by )?(morning|noon|lunch(?:time)?|afternoon|evening|tonight)\b/i;

const KEYWORD_DURATIONS: Array<[RegExp, number]> = [
  [/\b(quick|reply|email|emails|call|ping|check|review pr|text)\b/i, 30],
  [/\b(standup|sync|meeting|1:1|interview)\b/i, 45],
  [/\b(gym|workout|run|walk|lunch|yoga)\b/i, 60],
  [/\b(deep|write|build|code|design|study|deck|slides|research|draft|prototype)\b/i, 90],
];

const PRIORITY_KEYWORDS = /\b(urgent|asap|deadline|finish|ship|submit|deck|slides)\b/i;

function splitIntents(text: string): string[] {
  return text
    .split(/\n|[.;!?]|,|\band then\b|\bthen\b|\band\b/i)
    .map((chunk) => chunk.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((chunk) => chunk.replace(/[^a-z0-9]/gi, "").length >= 3);
}

function inferDuration(chunk: string): number {
  const hours = chunk.match(DURATION_HOURS_RE);
  const mins = chunk.match(DURATION_MINS_RE);
  let minutes: number | null = null;
  if (hours) minutes = Math.round(parseFloat(hours[1]) * 60);
  else if (mins) minutes = parseInt(mins[1], 10);
  else minutes = KEYWORD_DURATIONS.find(([re]) => re.test(chunk))?.[1] ?? 60;

  const rounded = Math.round(minutes / 15) * 15;
  return Math.min(Math.max(rounded, 15), 180);
}

function inferPreferredStart(chunk: string): number | null {
  const clock = chunk.match(CLOCK_RE);
  if (clock) {
    let hour = parseInt(clock[1], 10) % 12;
    if (clock[3].toLowerCase() === "pm") hour += 12;
    const minute = clock[2] ? parseInt(clock[2], 10) : 0;
    return hour * 60 + minute;
  }
  const part = chunk.match(PART_OF_DAY_RE)?.[1].toLowerCase();
  if (!part) return null;
  if (part === "morning") return 9 * 60;
  if (part === "noon" || part.startsWith("lunch")) return 12 * 60;
  if (part === "afternoon") return 14 * 60;
  return 18 * 60; // evening / tonight
}

function cleanTitle(chunk: string): string {
  const stripped = chunk
    .replace(DURATION_HOURS_RE, "")
    .replace(DURATION_MINS_RE, "")
    .replace(CLOCK_RE, "")
    .replace(PART_OF_DAY_RE, "")
    .replace(/\b(?:i need to|i have to|i should|need to|have to|gotta|must|todo:?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[\s,-]+$/, "");
  const title = stripped.length > 0 ? stripped : chunk.trim();
  return (title.charAt(0).toUpperCase() + title.slice(1)).slice(0, 80);
}

interface Intent {
  title: string;
  duration: number;
  preferred: number | null;
  priority: boolean;
  order: number;
}

function toIntent(chunk: string, order: number): Intent {
  return {
    title: cleanTitle(chunk),
    duration: inferDuration(chunk),
    preferred: inferPreferredStart(chunk),
    priority: PRIORITY_KEYWORDS.test(chunk),
    order,
  };
}

export function scheduleFromText(text: string): ScheduledTaskDraft[] {
  const fromUser = splitIntents(text);
  const titles = new Set<string>();
  const intents: Intent[] = [];

  for (const chunk of [...fromUser, ...splitIntents(DUMMY_BRAIN_DUMP)]) {
    if (intents.length === TASK_COUNT) break;
    const intent = toIntent(chunk, intents.length);
    const key = intent.title.toLowerCase();
    if (titles.has(key)) continue;
    titles.add(key);
    intents.push(intent);
  }

  // Anchored tasks by their time; floating ones by priority (deep work early), then input order.
  const anchored = intents.filter((i) => i.preferred !== null).sort((a, b) => a.preferred! - b.preferred!);
  const floating = intents
    .filter((i) => i.preferred === null)
    .sort((a, b) => Number(b.priority) - Number(a.priority) || a.order - b.order);

  const placed: Array<{ start: number; end: number; intent: Intent }> = [];
  const overlaps = (start: number, end: number) => placed.some((p) => start < p.end && end > p.start);
  const latestStart = (duration: number) => DAY_END_HOUR * 60 - duration;
  const roundUp = (m: number) => Math.ceil(m / 15) * 15;

  const place = (intent: Intent, from: number) => {
    let start = roundUp(Math.min(from, latestStart(intent.duration)));
    while (overlaps(start, start + intent.duration) && start + 15 <= latestStart(intent.duration)) start += 15;
    placed.push({ start, end: start + intent.duration, intent });
  };

  for (const intent of anchored) place(intent, intent.preferred!);
  let cursor = DEFAULT_START;
  for (const intent of floating) {
    place(intent, cursor);
    cursor = placed[placed.length - 1].end + 15; // 15-min buffer between floating tasks
  }

  return placed
    .sort((a, b) => a.start - b.start)
    .map(({ start, intent }) => ({
      title: intent.title,
      startTime: fromMinutes(start),
      duration: intent.duration,
    }));
}

export async function mockLlmSchedule(text: string): Promise<ScheduledTaskDraft[]> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return scheduleFromText(text.trim() || DUMMY_BRAIN_DUMP);
}
