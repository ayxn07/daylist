# Daylist

**Dump your brain. Let it sort. Swipe it done.**

Next.js (App Router) · Tailwind CSS v4 · Framer Motion · @dnd-kit · lucide-react · TypeScript

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Features

| # | Feature | Where |
|---|---------|-------|
| 1 | **Magic Sort brain dump.** Free text goes to `POST /api/schedule`, which returns 3 structured tasks. Each one is placed in the earliest empty slot that fits its duration. If the day is full, the task goes to Deferred. | `components/BrainDump.tsx`, `app/api/schedule/route.ts`, `lib/mock-llm.ts` |
| 6 | **GitHub-style heatmap.** 7×12 CSS grid of 12px cells with 4px gaps. Shows 60 days of seeded dummy data. Today's cell tracks your live completed count. Hover a cell for a tooltip. | `components/Heatmap.tsx`, `lib/heatmap.ts` |
| 8 | **Timeline with drag and drop.** Hourly slots from 8 AM to 8 PM. The **grip handle** is the only dnd-kit activator, and drags are locked to the vertical axis. You can also reorder cards within a slot. Long tasks hatch the slots they run into. A live NOW line shows the current time. | `components/Timeline.tsx`, `components/TimeSlot.tsx` |
| 9 | **Tinder-style swipe on the card body.** Swipe right to complete, left to defer, with tilt and reveal labels. A small swipe springs back. Buttons give the same actions for keyboard and accessibility. | `components/TaskCard.tsx` |

### How the gestures avoid conflicting
- dnd-kit listeners are attached **only** to the grip button, via `setActivatorNodeRef`.
- Framer Motion runs with `dragListener={false}`. The card body starts the swipe itself with `dragControls.start(e)`. A pointerdown on the handle never reaches Framer, and a pointerdown on the body never reaches dnd-kit.
- The body uses `touch-action: pan-y`, so vertical page scrolling still works on mobile.

## State
`lib/store.tsx` holds the global task state with Context and `useReducer`. Each task has the shape `{ id, title, startTime: "HH:MM", duration (min), status: "pending" | "completed" | "deferred" }`. State is saved to `localStorage`. Use **Reset demo** in the header to restore the seed day.

## API
```http
POST /api/schedule
{ "text": "write blog post for 2h, call bank at 3pm, groceries in the evening" }

→ [ { "title": "Write blog post", "startTime": "09:00", "duration": 120 }, … ]   // always 3 items
```
An empty `text` returns the built-in demo dump. The mock "LLM" splits the text into intents and works out durations from phrases like `2h`, `30 min`, and keywords. It reads time hints such as `at 3pm` and `evening`, then lays the tasks out without overlaps. To switch to a real model, change `mockLlmSchedule` in `lib/mock-llm.ts` to return the same `ScheduledTaskDraft[]` shape. The route and the client already validate it.
