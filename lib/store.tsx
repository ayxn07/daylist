"use client";

import { arrayMove } from "@dnd-kit/sortable";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { fromMinutes, toMinutes } from "./time";
import { isTask, type Task } from "./types";

const STORAGE_KEY = "daylist.tasks.v2";

export const SEED_TASKS: Task[] = [
  { id: "seed-standup", title: "Team standup", startTime: "09:00", duration: 30, status: "completed" },
  { id: "seed-deck", title: "Deep work: pitch deck narrative", startTime: "10:00", duration: 120, status: "pending" },
  { id: "seed-lunch", title: "Lunch + walk, no screens", startTime: "13:00", duration: 60, status: "pending" },
  { id: "seed-demo", title: "Record the demo walkthrough", startTime: "15:00", duration: 90, status: "pending" },
];

export type TaskAction =
  | { type: "hydrate"; tasks: Task[] }
  | { type: "addMany"; tasks: Task[] }
  | { type: "update"; id: string; patch: Partial<Omit<Task, "id">> }
  | { type: "move"; id: string; hour: number; overId: string | null }
  | { type: "remove"; id: string };

export function taskReducer(state: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case "hydrate":
      return action.tasks;

    case "addMany":
      return [...state, ...action.tasks];

    case "update":
      return state.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t));

    case "remove":
      return state.filter((t) => t.id !== action.id);

    case "move": {
      const from = state.findIndex((t) => t.id === action.id);
      if (from === -1) return state;

      const task = state[from];
      const minuteOffset = toMinutes(task.startTime) % 60;
      const moved: Task = { ...task, startTime: fromMinutes(action.hour * 60 + minuteOffset) };
      const next = state.slice();
      next[from] = moved;

      // Dropped onto another card → take its position (handles in-slot reordering too).
      if (action.overId && action.overId !== action.id) {
        const to = next.findIndex((t) => t.id === action.overId);
        if (to !== -1) return arrayMove(next, from, to);
      }

      // Dropped onto an empty part of a slot → becomes last in that slot.
      if (!action.overId) {
        next.splice(from, 1);
        next.push(moved);
      }
      return next;
    }
  }
}

interface TaskContextValue {
  tasks: Task[];
  dispatch: Dispatch<TaskAction>;
  hydrated: boolean;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, dispatch] = useReducer(taskReducer, SEED_TASKS);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state after mount so server and first client render match.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const valid = parsed.filter((t): t is Task => {
            if (!isTask(t) || seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          });
          dispatch({ type: "hydrate", tasks: valid });
        }
      }
    } catch {
      // Corrupt or unavailable storage — keep seed tasks.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Storage full or blocked — state still lives in memory.
    }
  }, [tasks, hydrated]);

  const value = useMemo(() => ({ tasks, dispatch, hydrated }), [tasks, hydrated]);
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used inside <TaskProvider>");
  return ctx;
}
