"use client";

import { CalendarPlus, Inbox, Trash2 } from "lucide-react";
import { formatDuration } from "@/lib/time";
import type { Task } from "@/lib/types";

function PanelHeader({ index, title, aside }: { index: string; title: string; aside?: string }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-neutral-800 px-4 py-2">
      <h2 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-neutral-300">
        <span className="text-neon">{index} /</span> {title}
      </h2>
      {aside && <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">{aside}</span>}
    </div>
  );
}

export function StatsPanel({ tasks }: { tasks: Task[] }) {
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const deferred = tasks.filter((t) => t.status === "deferred").length;
  const scheduled = completed + pending;
  const pct = scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
  const focusMinutes = tasks.filter((t) => t.status !== "deferred").reduce((sum, t) => sum + t.duration, 0);

  const stats = [
    { label: "Done", value: completed, className: "text-neon" },
    { label: "Left", value: pending, className: "text-neutral-100" },
    { label: "Parked", value: deferred, className: "text-amber-400" },
  ];

  return (
    <section aria-label="Momentum" className="border-2 border-neutral-800 bg-neutral-950">
      <PanelHeader index="03" title="Momentum" aside={`${formatDuration(focusMinutes)} planned`} />
      <div className="grid grid-cols-3 divide-x-2 divide-neutral-800 border-b-2 border-neutral-800">
        {stats.map((s) => (
          <div key={s.label} className="px-4 py-3">
            <p className={`font-mono text-3xl font-bold tabular-nums ${s.className}`}>{s.value}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-3">
        <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          <span>Progress</span>
          <span className="tabular-nums text-neutral-300">{pct}%</span>
        </div>
        <div
          className="h-3 border-2 border-neutral-800 bg-black"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Tasks completed today"
        >
          <div className="h-full bg-neon transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </section>
  );
}

interface DeferredTrayProps {
  tasks: Task[];
  onReschedule: (id: string) => void;
  onRemove: (id: string) => void;
}

export function DeferredTray({ tasks, onReschedule, onRemove }: DeferredTrayProps) {
  const deferred = tasks.filter((t) => t.status === "deferred");

  return (
    <section aria-label="Deferred tasks" className="border-2 border-neutral-800 bg-neutral-950">
      <PanelHeader index="04" title="Deferred" aside={`${deferred.length} parked`} />
      {deferred.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <Inbox className="size-5 text-neutral-700" aria-hidden />
          <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-600">
            Swipe a card left to park it here
          </p>
        </div>
      ) : (
        <ul className="divide-y-2 divide-neutral-900">
          {deferred.map((task) => (
            <li key={task.id} className="flex items-center gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-300">{task.title}</p>
                <p className="font-mono text-[11px] text-neutral-600">{formatDuration(task.duration)}</p>
              </div>
              <button
                type="button"
                onClick={() => onReschedule(task.id)}
                aria-label={`Reschedule "${task.title}" into the earliest open slot`}
                title="Reschedule to earliest open slot"
                className="grid size-7 place-items-center border-2 border-neutral-800 text-neutral-500 transition-colors hover:border-neon hover:text-neon focus-visible:border-neon focus-visible:text-neon focus-visible:outline-none"
              >
                <CalendarPlus className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(task.id)}
                aria-label={`Delete "${task.title}"`}
                title="Delete"
                className="grid size-7 place-items-center border-2 border-neutral-800 text-neutral-500 transition-colors hover:border-red-500 hover:text-red-500 focus-visible:border-red-500 focus-visible:text-red-500 focus-visible:outline-none"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
