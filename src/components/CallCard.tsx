"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDuration } from "@/lib/format";
import type { SerializedCall } from "@/lib/types";

export function CallCard({ call }: { call: SerializedCall }) {
  const [open, setOpen] = useState(false);
  const hasTranscript = Boolean(call.transcript?.trim());

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
        </div>
      </div>

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
