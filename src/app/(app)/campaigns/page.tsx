import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { listCampaigns, listContacts, listScripts } from "@/server/queries";
import { CampaignBuilder } from "./CampaignBuilder";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const user = await requireUser();
  const [campaigns, scripts, contacts] = await Promise.all([
    listCampaigns(user.id),
    listScripts(user.id),
    listContacts(user.id),
  ]);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Campaigns</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Pick a script and contacts, then call them one-by-one or all at once.
      </p>

      <CampaignBuilder
        scripts={scripts.map((s) => ({ id: s.id, name: s.name }))}
        contacts={contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
      />

      <h2 className="mt-10 text-lg font-semibold">All campaigns</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {campaigns.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">No campaigns yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Calls</th>
                <th className="px-4 py-3 font-medium">Follow-ups</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3">
                    <Link className="hover:text-[var(--accent)]" href={`/campaigns/${c.id}`}>
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-[var(--muted)]">{c.mode}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">{c.call_count}</td>
                  <td className="px-4 py-3">{c.follow_up_count}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
