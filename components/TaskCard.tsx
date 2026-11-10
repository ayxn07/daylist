"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { animate, motion, useDragControls, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Check, Clock, GripVertical, RotateCcw } from "lucide-react";
import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { endTimeOf, formatDuration, formatTime } from "@/lib/time";
import type { Task } from "@/lib/types";

const SWIPE_THRESHOLD = 110;
const FLICK_VELOCITY = 700; // px/s
const FLICK_MIN_DISTANCE = 60;
const FLY_DISTANCE = 520;

export interface TaskCardHandlers {
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
  onUndo: (id: string) => void;
}

interface TaskCardProps extends TaskCardHandlers {
  task: Task;
  hour: number;
  isNew?: boolean;
}

function TaskMeta({ task }: { task: Task }) {
  return (
    <p className="font-mono text-[11px] text-neutral-500">
      {formatTime(task.startTime)} → {formatTime(endTimeOf(task))}
      <span className="mx-1.5 text-neutral-700">/</span>
      {formatDuration(task.duration)}
    </p>
  );
}

function IconButton({
  label,
  onClick,
  children,
  tone = "neon",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: "neon" | "amber" | "muted";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-7 place-items-center border-2 border-neutral-800 text-neutral-500 transition-colors",
        "focus-visible:outline-none",
        tone === "neon" && "hover:border-neon hover:text-neon focus-visible:border-neon focus-visible:text-neon",
        tone === "amber" && "hover:border-amber-400 hover:text-amber-400 focus-visible:border-amber-400 focus-visible:text-amber-400",
        tone === "muted" && "hover:border-neutral-400 hover:text-neutral-200 focus-visible:border-neutral-400",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Two independent gestures, no conflict:
 *  - Grip handle (left)  → @dnd-kit vertical drag between time slots (activator only).
 *  - Card body           → Framer Motion horizontal swipe. Right = complete, left = defer.
 * The body starts Framer's drag manually via dragControls, so pointerdown on the
 * handle never reaches Framer, and dnd-kit listeners are never attached to the body.
 */
export function TaskCard({ task, hour, isNew, onComplete, onDefer, onUndo }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: "task", hour } });

  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const rotate = useTransform(x, [-240, 0, 240], [-5, 0, 5]);
  const doneOpacity = useTransform(x, [16, SWIPE_THRESHOLD], [0, 1]);
  const deferOpacity = useTransform(x, [-SWIPE_THRESHOLD, -16], [1, 0]);
  const [busy, setBusy] = useState(false);

  const completed = task.status === "completed";

  async function commit(direction: 1 | -1) {
    if (busy) return;
    setBusy(true);
    await Promise.all([
      animate(x, direction * FLY_DISTANCE, { duration: 0.22, ease: "easeIn" }),
      animate(opacity, 0, { duration: 0.22 }),
    ]);

    if (direction === 1) {
      onComplete(task.id);
      // Card stays on the timeline in its completed state — bring it back in.
      x.jump(0);
      void animate(opacity, 1, { duration: 0.25 });
      setBusy(false);
    } else {
      onDefer(task.id); // leaves the timeline; component unmounts
    }
  }

  function handleSwipeEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const { offset, velocity } = info;
    // Commit on a long drag, or a fast flick that has travelled a meaningful distance.
    const flick = Math.abs(velocity.x) > FLICK_VELOCITY && Math.abs(offset.x) > FLICK_MIN_DISTANCE;
    const direction = Math.sign(offset.x) as 1 | -1 | 0;

    if (direction !== 0 && (Math.abs(offset.x) > SWIPE_THRESHOLD || flick)) void commit(direction);
    else void animate(x, 0, { type: "spring", stiffness: 520, damping: 34 });
  }

  function startSwipe(e: ReactPointerEvent<HTMLDivElement>) {
    if (completed || busy || isDragging) return;
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
    dragControls.start(e);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "opacity-30")}
    >
      {/* Swipe reveal layer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-between border-2 border-dashed border-neutral-800 px-4 font-mono text-xs font-bold uppercase tracking-[0.25em]"
      >
        <motion.span style={{ opacity: doneOpacity }} className="flex items-center gap-1.5 text-neon">
          <Check className="size-4" /> Done
        </motion.span>
        <motion.span style={{ opacity: deferOpacity }} className="flex items-center gap-1.5 text-amber-400">
          Defer <Clock className="size-4" />
        </motion.span>
      </div>

      <motion.div
        drag={completed ? false : "x"}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        onDragEnd={handleSwipeEnd}
        style={{ x, rotate, opacity }}
        className={cn(
          "relative flex items-stretch border-2 bg-neutral-950",
          completed ? "border-green-900/70 bg-green-950/20" : "border-neutral-800 hover:border-neutral-600",
          isNew && "animate-glow border-neon",
        )}
      >
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Move "${task.title}" to another time slot`}
          className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center border-r-2 border-neutral-800 text-neutral-600 transition-colors hover:bg-neutral-900 hover:text-neon focus-visible:bg-neutral-900 focus-visible:text-neon focus-visible:outline-none active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>

        <div
          onPointerDown={startSwipe}
          style={{ touchAction: completed ? "auto" : "pan-y" }}
          className={cn(
            "flex min-w-0 flex-1 select-none items-center gap-3 px-3 py-2.5",
            !completed && "cursor-grab active:cursor-grabbing",
          )}
        >
          {completed && (
            <span className="grid size-5 shrink-0 place-items-center bg-neon text-black" aria-hidden>
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm font-semibold",
                completed ? "text-neutral-500 line-through decoration-neon/60" : "text-neutral-100",
              )}
            >
              {task.title}
            </p>
            <TaskMeta task={task} />
          </div>

          <div data-no-swipe className="flex shrink-0 gap-1">
            {completed ? (
              <IconButton label="Mark as not done" onClick={() => onUndo(task.id)} tone="muted">
                <RotateCcw className="size-3.5" />
              </IconButton>
            ) : (
              <>
                <IconButton label="Complete task" onClick={() => void commit(1)}>
                  <Check className="size-3.5" />
                </IconButton>
                <IconButton label="Defer task" onClick={() => void commit(-1)} tone="amber">
                  <Clock className="size-3.5" />
                </IconButton>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** Static clone rendered in the DragOverlay while a card is being moved. */
export function TaskCardPreview({ task }: { task: Task }) {
  const completed = task.status === "completed";
  return (
    <div className="flex cursor-grabbing items-stretch border-2 border-neon bg-neutral-950 shadow-[6px_6px_0_0_#39ff14]">
      <div className="flex w-8 shrink-0 items-center justify-center border-r-2 border-neon/40 text-neon">
        <GripVertical className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <p className={cn("truncate text-sm font-semibold", completed && "text-neutral-500 line-through")}>
          {task.title}
        </p>
        <TaskMeta task={task} />
      </div>
    </div>
  );
}
