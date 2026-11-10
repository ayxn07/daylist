import { NextResponse } from "next/server";
import { mockLlmSchedule } from "@/lib/mock-llm";
import { isScheduledTaskDraft } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_INPUT_CHARS = 4000;

/**
 * POST /api/schedule
 * Body: { text: string }  (empty text → the built-in demo brain dump)
 * Returns: ScheduledTaskDraft[] — exactly 3 tasks with start times.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  const text =
    typeof body === "object" && body !== null && "text" in body && typeof body.text === "string"
      ? body.text
      : "";

  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Brain dump is too long (max ${MAX_INPUT_CHARS} characters).` },
      { status: 413 },
    );
  }

  try {
    const tasks = await mockLlmSchedule(text);
    if (!tasks.every(isScheduledTaskDraft)) {
      return NextResponse.json({ error: "Scheduler produced invalid tasks." }, { status: 502 });
    }
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Scheduler failed. Try again." }, { status: 500 });
  }
}
