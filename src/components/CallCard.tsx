"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDuration } from "@/lib/format";
import type { SerializedCall } from "@/lib/types";

export function CallCard({
  call,
  onChanged,
}: {
  call: SerializedCall;
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [redialing, setRedialing] = useState(false);
  const hasTranscript = Boolean(call.transcript?.trim());

  async function callAgain() {
    setRedialing(true);
    await fetch(`/api/calls/${call.id}/redial`, { method: "POST" });
    setRedialing(false);
    onChanged?.();
  }

  async function sendText() {
    const body = window.prompt(`Text ${call.to_number}:`);
    if (!body?.trim()) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toNumber: call.to_number, body, callId: call.id }),
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {call.contact_name ?? call.to_number}
          </div>
          <div className="text-xs text-[var(--muted)]">{call.to_number}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {call.needs_follow_up && (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
              Follow up
            </span>
          )}
          <span className="text-xs text-[var(--muted)]">
            {formatDuration(call.duration_seconds)}
          </span>
          <StatusBadge status={call.status} />
          {onChanged && (
            <>
              <button
                onClick={callAgain}
                disabled={redialing}
                className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-xs hover:bg-[var(--surface-2)] disabled:opacity-60"
              >
                {redialing ? "…" : "Call again"}
              </button>
              <button
                onClick={sendText}
                className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-xs hover:bg-[var(--surface-2)]"
              >
                Text
              </button>
            </>
          )}
        </div>
      </div>

      {call.summary && (
        <p className="mt-2 text-sm">
          <span className="text-[var(--muted)]">Summary:</span> {call.summary}
        </p>
      )}

      {(call.sentiment || call.next_action) && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          {call.sentiment && (
            <span
              className={`rounded-full border px-2 py-0.5 capitalize ${
                call.sentiment === "positive"
                  ? "border-green-500/30 bg-green-500/15 text-green-400"
                  : call.sentiment === "negative"
                    ? "border-red-500/30 bg-red-500/15 text-red-400"
                    : "border-slate-500/30 bg-slate-500/15 text-slate-300"
              }`}
            >
              {call.sentiment}
            </span>
          )}
          {call.next_action && (
            <span>
              <span className="text-[var(--foreground)]">Next:</span> {call.next_action}
            </span>
          )}
        </div>
      )}

      {call.follow_up_reason && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          <span className="text-[var(--foreground)]">Why:</span> {call.follow_up_reason}
          {call.follow_up_score != null && (
            <span className="ml-1 text-xs">
              (score {call.follow_up_score.toFixed(2)})
            </span>
          )}
        </p>
      )}

      {call.error && (
        <p className="mt-2 text-sm text-[var(--danger)]">Error: {call.error}</p>
      )}

      {hasTranscript && (
        <div className="mt-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            {open ? "Hide transcript" : "Show transcript"}
          </button>
          {open && (
            <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
              {call.transcript}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
