"use client";

import { useState } from "react";

interface TaskItem {
  id: string;
  title: string;
  notes: string | null;
  status: "open" | "done";
  contact_name: string | null;
  contact_phone: string | null;
  due_at: string | null;
}

export function TasksView({ initialTasks }: { initialTasks: TaskItem[] }) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");

  async function refresh() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks((await res.json()).tasks);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    await refresh();
  }

  async function toggle(t: TaskItem) {
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: t.status === "open" ? "done" : "open" }),
    });
    await refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await refresh();
  }

  const shown = tasks.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="mt-6">
      <form onSubmit={addTask} className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          placeholder="Add a follow-up task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Add
        </button>
      </form>

      <div className="mt-4 flex rounded-lg border border-[var(--border)] p-1 w-fit">
        {(["open", "all", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1 text-sm capitalize ${
              filter === f ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {shown.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No tasks here.</p>
        )}
        {shown.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={t.status === "done"}
              onChange={() => toggle(t)}
            />
            <div className="min-w-0 flex-1">
              <div
                className={`font-medium ${
                  t.status === "done" ? "text-[var(--muted)] line-through" : ""
                }`}
              >
                {t.title}
              </div>
              {(t.contact_name || t.contact_phone) && (
                <div className="text-xs text-[var(--muted)]">
                  {t.contact_name} {t.contact_phone ? `· ${t.contact_phone}` : ""}
                </div>
              )}
              {t.notes && <p className="mt-1 text-sm text-[var(--muted)]">{t.notes}</p>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="text-sm text-[var(--muted)] hover:text-[var(--danger)]"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
