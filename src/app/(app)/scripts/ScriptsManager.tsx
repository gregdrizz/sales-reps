"use client";

import { useState } from "react";

export interface ScriptItem {
  id: string;
  name: string;
  instruction: string;
  language: string | null;
  voice_gender: "female" | "male";
}

const EMPTY = { name: "", instruction: "", language: "", voiceGender: "female" as const };

export function ScriptsManager({ initialScripts }: { initialScripts: ScriptItem[] }) {
  const [scripts, setScripts] = useState<ScriptItem[]>(initialScripts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    instruction: string;
    language: string;
    voiceGender: "female" | "male";
  }>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/scripts");
    const data = await res.json();
    setScripts(data.scripts);
  }

  function startEdit(s: ScriptItem) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      instruction: s.instruction,
      language: s.language ?? "",
      voiceGender: s.voice_gender,
    });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      instruction: form.instruction,
      language: form.language || null,
      voiceGender: form.voiceGender,
    };
    const res = await fetch(
      editingId ? `/api/scripts/${editingId}` : "/api/scripts",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setBusy(false);
    if (!res.ok) {
      setError("Could not save script.");
      return;
    }
    reset();
    await refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this script?")) return;
    const res = await fetch(`/api/scripts/${id}`, { method: "DELETE" });
    if (res.ok) await refresh();
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={save}
        className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <h2 className="font-semibold">{editingId ? "Edit script" : "New script"}</h2>
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          placeholder="Name (e.g. Intro pitch)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <textarea
          className="h-40 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          placeholder="Instruction / system prompt the AI agent follows on the call…"
          value={form.instruction}
          onChange={(e) => setForm({ ...form, instruction: e.target.value })}
          required
        />
        <div className="flex gap-3">
          <input
            className="w-32 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder="lang (he-IL)"
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
          />
          <select
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            value={form.voiceGender}
            onChange={(e) =>
              setForm({ ...form, voiceGender: e.target.value as "female" | "male" })
            }
          >
            <option value="female">Female voice</option>
            <option value="male">Male voice</option>
          </select>
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {busy ? "Saving…" : editingId ? "Update" : "Create"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-2)]"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {scripts.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No scripts yet.</p>
        )}
        {scripts.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {s.voice_gender} voice{s.language ? ` · ${s.language}` : ""}
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() => startEdit(s)}
                  className="text-[var(--muted)] hover:text-[var(--accent)]"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--muted)]">
              {s.instruction}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
