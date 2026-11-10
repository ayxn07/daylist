"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatHour } from "@/lib/time";
import type { Task } from "@/lib/types";

interface TimeSlotProps {
  hour: number;
  taskIds: string[];
  continuing: Task[];
  highlighted: boolean;
  /** 0–1 position of the "now" line inside this slot, or null */
  nowOffset: number | null;
  children: ReactNode;
}

export function TimeSlot({ hour, taskIds, continuing, highlighted, nowOffset, children }: TimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${hour}`, data: { type: "slot", hour } });
  const active = highlighted || isOver;
  const empty = taskIds.length === 0;

  return (
    <li className="flex">
      <div
        className={cn(
          "w-16 shrink-0 border-t-2 border-neutral-900 py-2 pr-3 text-right font-mono text-[11px] uppercase tracking-wider transition-colors sm:w-20",
          active ? "text-neon" : "text-neutral-500",
        )}
      >
        {formatHour(hour)}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "relative flex min-h-[76px] min-w-0 flex-1 flex-col gap-2 border-l-2 border-t-2 border-t-neutral-900 p-2 transition-colors",
          active ? "border-l-neon bg-neon/[0.04]" : "border-l-neutral-800",
          empty && continuing.length > 0 && !active && "bg-hatch",
        )}
      >
        {nowOffset !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute -left-[5px] right-0 z-10 flex items-center"
            style={{ top: `${nowOffset * 100}%` }}
          >
            <span className="size-2 bg-neon" />
            <span className="h-px flex-1 bg-neon/70" />
            <span className="bg-neon px-1 font-mono text-[9px] font-bold leading-3 text-black">NOW</span>
          </div>
        )}

        {continuing.map((t) => (
          <p key={t.id} className="truncate font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            ↳ {t.title} <span className="text-neutral-700">continues</span>
          </p>
        ))}

        <SortableContext id={`slot-${hour}`} items={taskIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>

        {empty && continuing.length === 0 && (
          <span
            className={cn(
              "m-auto font-mono text-[10px] uppercase tracking-[0.3em] transition-opacity",
              active ? "text-neon opacity-100" : "text-neutral-800 opacity-0 group-hover/timeline:opacity-100",
            )}
          >
            {active ? "Drop here" : "Open"}
          </span>
        )}
      </div>
    </li>
  );
}
