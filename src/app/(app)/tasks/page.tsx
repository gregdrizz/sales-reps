import { requireUser } from "@/server/auth/session";
import { listTasks } from "@/server/queries";
import { TasksView } from "./TasksView";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await listTasks(user.id);
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Follow-ups</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Tasks auto-created from calls flagged for follow-up, plus anything you add.
      </p>
      <TasksView
        initialTasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          notes: t.notes,
          status: t.status,
          contact_name: t.contact_name,
          contact_phone: t.contact_phone,
          due_at: t.due_at ? new Date(t.due_at).toISOString() : null,
        }))}
      />
    </main>
  );
}
