"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SEED_TASKS, useTasks } from "@/lib/store";
import { findEarliestSlot, formatTime } from "@/lib/time";
import { createId, type ScheduledTaskDraft, type Task } from "@/lib/types";
import { BrainDump } from "./BrainDump";
import { Heatmap } from "./Heatmap";
import { DeferredTray, StatsPanel } from "./SidePanels";
import { Timeline } from "./Timeline";

const HIGHLIGHT_MS = 2600;
const TOAST_MS = 3200;

const todayFormatter = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" });

interface Toast {
  id: number;
  message: string;
}

function useTodayLabel(): string {
  const [label, setLabel] = useState("");
  useEffect(() => setLabel(todayFormatter.format(new Date())), []);
  return label;
}

/** Places drafts one by one into the earliest open slot; overflow goes to Deferred. */
function placeDrafts(existing: readonly Task[], drafts: readonly ScheduledTaskDraft[]): Task[] {
  const working = [...existing];
  const added: Task[] = [];
  for (const draft of drafts) {
    const slot = findEarliestSlot(working, draft.duration);
    const task: Task = {
      id: createId(),
      title: draft.title,
      duration: draft.duration,
      startTime: slot ?? draft.startTime,
      status: slot ? "pending" : "deferred",
    };
    working.push(task);
    added.push(task);
  }
  return added;
}

export function Dashboard() {
  const { tasks, dispatch } = useTasks();
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const todayLabel = useTodayLabel();

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const highlight = useCallback((ids: string[]) => setNewIds(new Set(ids)), []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (newIds.size === 0) return;
    const t = window.setTimeout(() => setNewIds(new Set()), HIGHLIGHT_MS);
    return () => window.clearTimeout(t);
  }, [newIds]);

  const handleSorted = useCallback(
    (drafts: ScheduledTaskDraft[]) => {
      const added = placeDrafts(tasks, drafts);
      dispatch({ type: "addMany", tasks: added });
      highlight(added.map((t) => t.id));

      const placed = added
        .filter((t) => t.status === "pending")
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      const overflow = added.length - placed.length;
      if (placed.length === 0) {
        notify("Day is full — new tasks parked in Deferred.");
      } else {
        const times = placed.map((t) => formatTime(t.startTime)).join(", ");
        notify(
          `Slotted ${placed.length} task${placed.length === 1 ? "" : "s"} at ${times}` +
            (overflow > 0 ? ` · ${overflow} parked (day full)` : ""),
        );
      }
    },
    [tasks, dispatch, highlight, notify],
  );

  const handleMove = useCallback(
    (id: string, hour: number, overId: string | null) => dispatch({ type: "move", id, hour, overId }),
    [dispatch],
  );

  const handleComplete = useCallback(
    (id: string) => dispatch({ type: "update", id, patch: { status: "completed" } }),
    [dispatch],
  );

  const handleUndo = useCallback(
    (id: string) => dispatch({ type: "update", id, patch: { status: "pending" } }),
    [dispatch],
  );

  const handleDefer = useCallback(
    (id: string) => {
      dispatch({ type: "update", id, patch: { status: "deferred" } });
      notify("Deferred. It's waiting in the tray.");
    },
    [dispatch, notify],
  );

  const handleReschedule = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const slot = findEarliestSlot(tasks, task.duration, id);
      if (!slot) {
        notify("No open slot left today.");
        return;
      }
      dispatch({ type: "update", id, patch: { status: "pending", startTime: slot } });
      highlight([id]);
      notify(`Back on the timeline at ${formatTime(slot)}.`);
    },
    [tasks, dispatch, highlight, notify],
  );

  const handleRemove = useCallback((id: string) => dispatch({ type: "remove", id }), [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: "hydrate", tasks: SEED_TASKS.map((t) => ({ ...t })) });
    notify("Demo day restored.");
  }, [dispatch, notify]);

  const completedToday = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="min-h-dvh">
      <header className="border-b-2 border-neutral-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <a href="/" className="flex w-fit items-center gap-2" aria-label="Daylist home">
              <span className="grid size-8 place-items-center bg-neon font-mono text-lg font-black text-black">D</span>
              <span className="font-mono text-2xl font-black uppercase tracking-tight">
                Daylist<span className="text-neon">.</span>
              </span>
            </a>
            <p className="max-w-sm text-sm text-neutral-400">
              Dump your brain. Let it sort. Swipe it done.
            </p>
            <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              <span suppressHydrationWarning>{todayLabel || " "}</span>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-neutral-600 transition-colors hover:text-neon focus-visible:text-neon focus-visible:outline-none"
              >
                <RefreshCw className="size-3" aria-hidden /> Reset demo
              </button>
            </div>
          </div>

          <Heatmap todayCompleted={completedToday} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <BrainDump onSorted={handleSorted} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Timeline
            tasks={tasks}
            newIds={newIds}
            onMove={handleMove}
            onComplete={handleComplete}
            onDefer={handleDefer}
            onUndo={handleUndo}
          />
          <aside className="space-y-6 lg:sticky lg:top-6">
            <StatsPanel tasks={tasks} />
            <DeferredTray tasks={tasks} onReschedule={handleReschedule} onRemove={handleRemove} />
          </aside>
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="border-2 border-neon bg-black px-4 py-2 font-mono text-xs text-neutral-100 shadow-[4px_4px_0_0_#39ff14]"
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
