"use client";

import { useCallback, useEffect, useState } from "react";
import { CallCard } from "@/components/CallCard";
import { isTerminalStatus, type SerializedCall } from "@/lib/types";

export function CallsView({
  initialCalls,
  initialFollowUpOnly,
}: {
  initialCalls: SerializedCall[];
  initialFollowUpOnly: boolean;
}) {
  const [calls, setCalls] = useState<SerializedCall[]>(initialCalls);
  const [followUpOnly, setFollowUpOnly] = useState(initialFollowUpOnly);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (followUp: boolean) => {
    const res = await fetch(`/api/calls${followUp ? "?followUp=true" : ""}`, {
      cache: "no-store",
    });
    if (res.ok) setCalls((await res.json()).calls);
  }, []);

  // Light auto-refresh while any call is still active.
  useEffect(() => {
    const anyActive = calls.some((c) => !isTerminalStatus(c.status));
    if (!anyActive) return;
    const t = setTimeout(() => load(followUpOnly), 5000);
    return () => clearTimeout(t);
  }, [calls, followUpOnly, load]);

  async function setFilter(next: boolean) {
    setFollowUpOnly(next);
    await load(next);
  }

  async function sync() {
    setSyncing(true);
    await fetch("/api/calls/sync", { method: "POST" });
    await load(followUpOnly);
    setSyncing(false);
  }

  return (
    <>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex rounded-lg border border-[var(--border)] p-1">
          <button
            onClick={() => setFilter(false)}
            className={`rounded-md px-3 py-1 text-sm ${
              !followUpOnly ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter(true)}
            className={`rounded-md px-3 py-1 text-sm ${
              followUpOnly ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
            }`}
          >
            Needs follow-up
          </button>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="ml-auto rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)] disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {calls.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No calls to show.</p>
        )}
        {calls.map((c) => (
          <div key={c.id}>
            {c.campaign_name && (
              <div className="mb-1 text-xs text-[var(--muted)]">{c.campaign_name}</div>
            )}
            <CallCard call={c} />
          </div>
        ))}
      </div>
    </>
  );
}
