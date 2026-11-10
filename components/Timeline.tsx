"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical, MoveHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DAY_END_HOUR, DAY_START_HOUR, formatHour, HOURS, isOnTimeline, slotHourOf, toMinutes } from "@/lib/time";
import type { Task } from "@/lib/types";
import { TaskCard, TaskCardPreview, type TaskCardHandlers } from "./TaskCard";
import { TimeSlot } from "./TimeSlot";

interface TimelineProps extends TaskCardHandlers {
  tasks: Task[];
  newIds: ReadonlySet<string>;
  onMove: (id: string, hour: number, overId: string | null) => void;
}

/** Prefer whatever is under the pointer; fall back to nearest for keyboard drags. */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : closestCenter(args);
};

function readHour(data: unknown): number | null {
  if (typeof data === "object" && data !== null && "hour" in data && typeof data.hour === "number") {
    return data.hour;
  }
  return null;
}

function useNowMinutes(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function Timeline({ tasks, newIds, onMove, onComplete, onDefer, onUndo }: TimelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overHour, setOverHour] = useState<number | null>(null);
  const now = useNowMinutes();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { byHour, continuingByHour } = useMemo(() => {
    const scheduled = tasks.filter(isOnTimeline);
    const by = new Map<number, Task[]>(HOURS.map((h) => [h, []]));
    const cont = new Map<number, Task[]>(HOURS.map((h) => [h, []]));

    for (const task of scheduled) {
      const slot = slotHourOf(task.startTime);
      by.get(slot)!.push(task);

      const end = toMinutes(task.startTime) + task.duration;
      for (const h of HOURS) {
        if (h > slot && h * 60 < end) cont.get(h)!.push(task);
      }
    }
    return { byHour: by, continuingByHour: cont };
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    setOverHour(readHour(e.over?.data.current));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverHour(null);
    const { active, over } = e;
    if (!over) return;

    const hour = readHour(over.data.current);
    if (hour === null) return;

    const overIsTask = over.data.current?.type === "task";
    const overId = overIsTask ? String(over.id) : null;
    if (overId === String(active.id)) return;

    onMove(String(active.id), hour, overId);
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverHour(null);
  }

  const nowInDay = now !== null && now >= DAY_START_HOUR * 60 && now < DAY_END_HOUR * 60;

  return (
    <section aria-labelledby="timeline-title" className="group/timeline border-2 border-neutral-800 bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-neutral-800 px-4 py-2">
        <h2 id="timeline-title" className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-neutral-300">
          <span className="text-neon">02 /</span> Today · {formatHour(DAY_START_HOUR)}–{formatHour(DAY_END_HOUR)}
        </h2>
        <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
          <span className="flex items-center gap-1">
            <GripVertical className="size-3" aria-hidden /> drag to move
          </span>
          <span className="flex items-center gap-1">
            <MoveHorizontal className="size-3" aria-hidden /> swipe → done · ← defer
          </span>
        </p>
      </div>

      <DndContext
        id="daylist-timeline"
        sensors={sensors}
        collisionDetection={collisionDetection}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <ol className="py-2 pr-2">
          {HOURS.map((hour) => {
            const slotTasks = byHour.get(hour)!;
            const nowOffset = nowInDay && Math.floor(now! / 60) === hour ? (now! % 60) / 60 : null;
            return (
              <TimeSlot
                key={hour}
                hour={hour}
                taskIds={slotTasks.map((t) => t.id)}
                continuing={continuingByHour.get(hour)!}
                highlighted={activeId !== null && overHour === hour}
                nowOffset={nowOffset}
              >
                {slotTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    hour={hour}
                    isNew={newIds.has(task.id)}
                    onComplete={onComplete}
                    onDefer={onDefer}
                    onUndo={onUndo}
                  />
                ))}
              </TimeSlot>
            );
          })}
          <li className="flex" aria-hidden>
            <div className="w-16 shrink-0 border-t-2 border-neutral-900 pt-2 pr-3 text-right font-mono text-[11px] uppercase tracking-wider text-neutral-500 sm:w-20">
              {formatHour(DAY_END_HOUR)}
            </div>
            <div className="flex-1 border-t-2 border-neutral-900" />
          </li>
        </ol>

        <DragOverlay modifiers={[restrictToVerticalAxis]} dropAnimation={{ duration: 160, easing: "ease-out" }}>
          {activeTask ? <TaskCardPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
