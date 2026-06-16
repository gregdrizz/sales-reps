import { formatDuration, statusColor } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { analytics } from "@/server/queries";

export const dynamic = "force-dynamic";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  const a = await analytics(user.id);

  const kpis = [
    { label: "Total calls", value: String(a.total) },
    { label: "Answer rate", value: pct(a.answerRate) },
    { label: "Avg duration", value: formatDuration(a.avgDuration) },
    { label: "Follow-up rate", value: pct(a.followUpRate) },
  ];

  const maxDay = Math.max(1, ...a.perDay.map((d) => d.count));
  const statuses = Object.entries(a.byStatus).sort((x, y) => y[1] - x[1]);
  const maxStatus = Math.max(1, ...statuses.map(([, n]) => n));

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Calling performance across your campaigns.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-3xl font-semibold">{k.value}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Calls per day */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-semibold">Calls (last 14 days)</h2>
          {a.perDay.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No calls yet.</p>
          ) : (
            <div className="mt-4 flex h-40 items-end gap-1">
              {a.perDay.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-[var(--accent)]"
                    style={{ height: `${(d.count / maxDay) * 100}%` }}
                    title={`${d.day}: ${d.count}`}
                  />
                  <span className="text-[10px] text-[var(--muted)]">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-semibold">Outcomes</h2>
          {statuses.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No calls yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {statuses.map(([status, n]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-24 text-xs capitalize text-[var(--muted)]">
                    {status.replace(/_/g, " ")}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--surface-2)]">
                    <div
                      className={`h-full border ${statusColor(status)}`}
                      style={{ width: `${(n / maxStatus) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Per-script */}
      <h2 className="mt-8 text-lg font-semibold">Per-script performance</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {a.perScript.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">No data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 font-medium">Script</th>
                <th className="px-4 py-3 font-medium">Calls</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Answer rate</th>
                <th className="px-4 py-3 font-medium">Follow-ups</th>
              </tr>
            </thead>
            <tbody>
              {a.perScript.map((s) => (
                <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">{s.total}</td>
                  <td className="px-4 py-3">{s.completed}</td>
                  <td className="px-4 py-3">
                    {s.total > 0 ? pct(s.completed / s.total) : "—"}
                  </td>
                  <td className="px-4 py-3">{s.followUps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
