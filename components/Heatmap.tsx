"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { buildHeatmap, HEATMAP_DAYS, HEATMAP_WEEKS, HISTORY_DAYS, levelClass } from "@/lib/heatmap";

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const LEGEND = [0, 2, 4, 7];

const dateFormatter = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });

export function Heatmap({ todayCompleted }: { todayCompleted: number }) {
  // Dates depend on the viewer's clock — compute after mount to avoid hydration mismatch.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  const cells = useMemo(
    () => (today ? buildHeatmap(today, todayCompleted) : null),
    [today, todayCompleted],
  );
  const total = cells?.reduce((sum, c) => sum + c.count, 0) ?? 0;

  return (
    <section aria-label={`Completion history for the last ${HISTORY_DAYS} days`} className="w-fit shrink-0">
      <div className="mb-2 flex items-baseline justify-between gap-6 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        <span>Last {HISTORY_DAYS} days</span>
        <span className="text-neon">{total} done</span>
      </div>

      <div className="flex gap-2">
        <div className="grid grid-rows-[repeat(7,12px)] gap-1 font-mono text-[9px] leading-3 text-neutral-600" aria-hidden>
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        <div className="grid grid-flow-col grid-cols-[repeat(12,12px)] grid-rows-[repeat(7,12px)] gap-1">
          {cells
            ? cells.map((cell) => (
                <div
                  key={cell.key}
                  className="group relative size-3"
                  role="img"
                  aria-hidden={cell.isFuture}
                  aria-label={`${cell.count} tasks completed on ${dateFormatter.format(cell.date)}`}
                >
                  <div
                    className={cn(
                      "size-3 rounded-sm transition-transform duration-100 group-hover:scale-125",
                      levelClass(cell.count),
                      cell.isToday && "ring-1 ring-neon ring-offset-1 ring-offset-black",
                      cell.isFuture && "invisible",
                    )}
                  />
                  {!cell.isFuture && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap border-2 border-neutral-700 bg-black px-2 py-1 font-mono text-[11px] shadow-[3px_3px_0_0_#39ff14] group-hover:block"
                    >
                      <span className="text-neon">
                        {cell.count} {cell.count === 1 ? "task" : "tasks"} completed
                      </span>
                      <span className="block text-neutral-500">
                        {cell.isToday ? "Today" : dateFormatter.format(cell.date)}
                      </span>
                    </div>
                  )}
                </div>
              ))
            : Array.from({ length: HEATMAP_WEEKS * HEATMAP_DAYS }, (_, i) => (
                <div key={i} className="size-3 rounded-sm bg-gray-800/60" />
              ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1 font-mono text-[9px] uppercase tracking-widest text-neutral-600" aria-hidden>
        <span className="mr-1">Less</span>
        {LEGEND.map((n) => (
          <span key={n} className={cn("size-3 rounded-sm", levelClass(n))} />
        ))}
        <span className="ml-1">More</span>
      </div>
    </section>
  );
}
