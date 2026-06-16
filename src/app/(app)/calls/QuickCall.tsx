"use client";

import { useState } from "react";

interface ScriptOpt {
  id: string;
  name: string;
}
interface ContactOpt {
  id: string;
  name: string;
  phone: string;
}

export function QuickCall({
  scripts,
  contacts,
  onPlaced,
}: {
  scripts: ScriptOpt[];
  contacts: ContactOpt[];
  onPlaced: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [number, setNumber] = useState("");
  const [scriptId, setScriptId] = useState(scripts[0]?.id ?? "");
  const [instruction, setInstruction] = useState("");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const useCustom = scriptId === "__custom__";

  async function call(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const body: Record<string, unknown> = { voiceGender };
    if (contactId) body.contactId = contactId;
    else if (number.trim()) body.toNumber = number.trim();
    else return setError("Pick a contact or enter a number.");
    if (useCustom) {
      if (!instruction.trim()) return setError("Enter an instruction.");
      body.instruction = instruction.trim();
    } else {
      if (!scriptId) return setError("Pick a script or write a custom instruction.");
      body.scriptId = scriptId;
    }

    setBusy(true);
    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not place the call.");
      return;
    }
    setInfo("Call queued — it will appear below as it dials.");
    setNumber("");
    setInstruction("");
    onPlaced();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
      >
        + Quick call
      </button>
    );
  }

  return (
    <form
      onSubmit={call}
      className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Quick call</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-[var(--muted)]">Contact</label>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">— enter a number —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
          {!contactId && (
            <input
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
              placeholder="+14155550123"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          )}
        </div>

        <div>
          <label className="block text-sm text-[var(--muted)]">Script</label>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            value={scriptId}
            onChange={(e) => setScriptId(e.target.value)}
          >
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="__custom__">— custom instruction —</option>
          </select>
          <select
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            value={voiceGender}
            onChange={(e) => setVoiceGender(e.target.value as "female" | "male")}
          >
            <option value="female">Female voice</option>
            <option value="male">Male voice</option>
          </select>
        </div>
      </div>

      {useCustom && (
        <textarea
          className="mt-3 h-28 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          placeholder="What should the AI agent say / do on this call?"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
        />
      )}

      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      {info && <p className="mt-3 text-sm text-[var(--success)]">{info}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {busy ? "Placing…" : "Call now"}
      </button>
    </form>
  );
}
