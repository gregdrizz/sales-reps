"use client";

import { useState } from "react";

export interface ContactItem {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
}

/** Parse "Name, +972..." or "Name +972..." lines into {name, phone}. */
function parseBulk(text: string): { name: string; phone: string }[] {
  const out: { name: string; phone: string }[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const phoneMatch = trimmed.match(/\+[1-9]\d{6,14}/);
    if (!phoneMatch) continue;
    const phone = phoneMatch[0];
    const name = trimmed.replace(phone, "").replace(/[,;|]/g, " ").trim() || phone;
    out.push({ name, phone });
  }
  return out;
}

export function ContactsManager({ initialContacts }: { initialContacts: ContactItem[] }) {
  const [contacts, setContacts] = useState<ContactItem[]>(initialContacts);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bulk, setBulk] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data.contacts);
  }

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not add contact — check the phone is E.164 (+countrycode).");
      return;
    }
    setName("");
    setPhone("");
    await refresh();
  }

  async function importBulk() {
    setError(null);
    setInfo(null);
    const parsed = parseBulk(bulk);
    if (parsed.length === 0) {
      setError("No valid phone numbers found. Use E.164, e.g. +14155550123.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts: parsed }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Bulk import failed.");
      return;
    }
    const data = await res.json();
    setInfo(`Imported ${data.count} new contact(s) from ${parsed.length} line(s).`);
    setBulk("");
    await refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) await refresh();
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <form
          onSubmit={addOne}
          className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <h2 className="font-semibold">Add contact</h2>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder="+14155550123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            Add
          </button>
        </form>

        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-semibold">Bulk import</h2>
          <p className="text-xs text-[var(--muted)]">
            One per line: <code>Name, +14155550123</code>
          </p>
          <textarea
            className="h-32 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder={"Asaf, +972502372752\nNiv, +972558839020"}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          />
          <button
            type="button"
            onClick={importBulk}
            disabled={busy}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-2)] disabled:opacity-60"
          >
            Import
          </button>
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {info && <p className="text-sm text-[var(--success)]">{info}</p>}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-medium">
          {contacts.length} contact(s)
        </div>
        <div className="max-h-[28rem] divide-y divide-[var(--border)] overflow-y-auto">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm">{c.name}</div>
                <div className="text-xs text-[var(--muted)]">{c.phone}</div>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="text-sm text-[var(--muted)] hover:text-[var(--danger)]"
              >
                Remove
              </button>
            </div>
          ))}
          {contacts.length === 0 && (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">No contacts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
