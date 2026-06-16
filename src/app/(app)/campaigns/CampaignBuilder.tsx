"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface ScriptOpt {
  id: string;
  name: string;
}
interface ContactOpt {
  id: string;
  name: string;
  phone: string;
}

export function CampaignBuilder({
  scripts,
  contacts,
}: {
  scripts: ScriptOpt[];
  contacts: ContactOpt[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scriptId, setScriptId] = useState(scripts[0]?.id ?? "");
  const [mode, setMode] = useState<"sequential" | "parallel">("sequential");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [retryDelayMin, setRetryDelayMin] = useState(5);
  const [scheduledAt, setScheduledAt] = useState("");
  const [workStart, setWorkStart] = useState("");
  const [workEnd, setWorkEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = useMemo(
    () => contacts.length > 0 && selected.size === contacts.length,
    [selected, contacts.length],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(contacts.map((c) => c.id)));
  }

  async function launch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!scriptId) return setError("Create a script first.");
    if (selected.size === 0) return setError("Select at least one contact.");

    setBusy(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || "Untitled campaign",
        scriptId,
        mode,
        contactIds: [...selected],
        maxAttempts,
        retryDelaySeconds: retryDelayMin * 60,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        workStartHour: workStart === "" ? null : Number(workStart),
        workEndHour: workEnd === "" ? null : Number(workEnd),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not launch campaign.");
      return;
    }
    const data = await res.json();
    router.push(`/campaigns/${data.campaign.id}`);
  }

  const disabled = scripts.length === 0 || contacts.length === 0;

  return (
    <form
      onSubmit={launch}
      className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <h2 className="font-semibold">New campaign</h2>
      {disabled && (
        <p className="mt-2 text-sm text-[var(--warning)]">
          You need at least one script and one contact to launch a campaign.
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-[var(--muted)]">Campaign name</label>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder="June outreach"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted)]">Script</label>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            value={scriptId}
            onChange={(e) => setScriptId(e.target.value)}
          >
            {scripts.length === 0 && <option value="">— no scripts —</option>}
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm text-[var(--muted)]">Calling mode</label>
        <div className="mt-2 flex gap-2">
          {(["sequential", "parallel"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg border px-4 py-2 text-sm capitalize transition ${
                mode === m
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {m === "sequential" ? "One by one" : "All at once"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-[var(--muted)]">
            Contacts ({selected.size}/{contacts.length} selected)
          </label>
          {contacts.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          )}
        </div>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
          {contacts.length === 0 && (
            <p className="px-3 py-4 text-sm text-[var(--muted)]">No contacts.</p>
          )}
          {contacts.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-3 border-b border-[var(--border)] px-3 py-2 text-sm last:border-0 hover:bg-[var(--surface)]"
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span>{c.name}</span>
              <span className="ml-auto text-xs text-[var(--muted)]">{c.phone}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          {showAdvanced ? "Hide" : "Show"} scheduling & retries
        </button>
        {showAdvanced && (
          <div className="mt-3 grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-[var(--muted)]">Start at (optional)</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)]">Max attempts per number</label>
              <input
                type="number"
                min={1}
                max={10}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)]">Retry delay (minutes)</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                value={retryDelayMin}
                onChange={(e) => setRetryDelayMin(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)]">Working hours (24h)</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  placeholder="9"
                  className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                />
                <span className="text-[var(--muted)]">to</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  placeholder="18"
                  className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={busy || disabled}
        className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {busy ? "Launching…" : "Launch campaign"}
      </button>
    </form>
  );
}
