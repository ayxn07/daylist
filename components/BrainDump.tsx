"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { isScheduledTaskDraft, type ScheduledTaskDraft } from "@/lib/types";

interface BrainDumpProps {
  onSorted: (drafts: ScheduledTaskDraft[]) => void;
}

type Status = "idle" | "loading" | "error";

function errorMessageFrom(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return `Request failed (${status}).`;
}

export function BrainDump({ onSorted }: BrainDumpProps) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const loading = status === "loading";

  async function magicSort() {
    if (loading) return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) throw new Error(errorMessageFrom(data, res.status));
      if (!Array.isArray(data) || !data.every(isScheduledTaskDraft)) {
        throw new Error("The scheduler returned an unexpected response.");
      }

      onSorted(data);
      setText("");
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void magicSort();
    }
  }

  return (
    <section aria-labelledby="brain-dump-title" className="border-2 border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between border-b-2 border-neutral-800 px-4 py-2">
        <h2 id="brain-dump-title" className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-neutral-300">
          <span className="text-neon">01 /</span> Brain dump
        </h2>
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-neutral-600 sm:block">
          Empty = demo dump · ⌘/Ctrl + Enter
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-stretch">
        <label htmlFor="brain-dump" className="sr-only">
          Everything on your mind
        </label>
        <textarea
          id="brain-dump"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          maxLength={4000}
          disabled={loading}
          placeholder="finish the pitch deck, reply to investor emails and a quick call with mentor, gym in the evening…"
          className="min-h-24 flex-1 resize-y border-2 border-neutral-800 bg-black p-3 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neon focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void magicSort()}
          disabled={loading}
          aria-busy={loading}
          className={cn(
            "group flex shrink-0 items-center justify-center gap-2 border-2 border-neon bg-neon px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest text-black",
            "shadow-[4px_4px_0_0_#fafafa] transition-[transform,box-shadow] duration-100",
            "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#fafafa]",
            "active:translate-x-1 active:translate-y-1 active:shadow-none",
            "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon",
            "disabled:cursor-wait disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none",
          )}
        >
          {loading ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Sorting…
            </>
          ) : (
            <>
              <Sparkles className="size-4 transition-transform group-hover:rotate-12" aria-hidden />
              Magic Sort
            </>
          )}
        </button>
      </div>

      {error && (
        <p role="alert" className="border-t-2 border-red-900 bg-red-950/40 px-4 py-2 font-mono text-xs text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
