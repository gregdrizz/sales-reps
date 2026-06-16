import { requireUser } from "@/server/auth/session";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-[var(--muted)]">Signed in as {user.name}.</p>
    </main>
  );
}
