"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CallCard } from "@/components/CallCard";
import { StatusBadge } from "@/components/StatusBadge";
import { isTerminalStatus, type SerializedCall } from "@/lib/types";

interface Initial {
  name: string;
  mode: string;
  status: string;
  scriptName: string;
  calls: SerializedCall[];
}

export function CampaignLive({
  campaignId,
  initial,
}: {
  campaignId: string;
  initial: Initial;
}) {
  const [calls, setCalls] = useState<SerializedCall[]>(initial.calls);
  const [status, setStatus] = useState(initial.status);
  const [syncing, setSyncing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anyActive =
    status === "pending" ||
    status === "running" ||
    calls.some((c) => !isTerminalStatus(c.status));

  const poll = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setCalls(data.calls);
      setStatus(data.campaign.status);
    }
  }, [campaignId]);

  // Auto-refresh while the campaign is still working.
  useEffect(() => {
    if (!anyActive) return;
    timer.current = setTimeout(poll, 4000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [anyActive, poll, calls, status]);

  async function forceSync() {
    setSyncing(true);
    await fetch("/api/calls/sync", { method: "POST" });
    await poll();
    setSyncing(false);
  }

  const followUps = calls.filter((c) => c.needs_follow_up).length;
  const done = calls.filter((c) => isTerminalStatus(c.status)).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{initial.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {initial.scriptName} · {initial.mode === "sequential" ? "one by one" : "all at once"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={status} />
          <button
            onClick={forceSync}
            disabled={syncing}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)] disabled:opacity-60"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-6 text-sm text-[var(--muted)]">
        <span>{calls.length} calls</span>
        <span>{done} finished</span>
        <span>{followUps} need follow-up</span>
        {anyActive && <span className="text-[var(--accent)]">● live</span>}
      </div>

      <div className="mt-6 space-y-3">
        {calls.map((c) => (
          <CallCard key={c.id} call={c} />
        ))}
      </div>
    </>
  );
}
