import { requireUser } from "@/server/auth/session";
import { listCalls, listContacts, listScripts } from "@/server/queries";
import { CallsView } from "./CallsView";
import type { SerializedCall } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ followUp?: string }>;
}) {
  const user = await requireUser();
  const { followUp } = await searchParams;
  const onlyFollowUp = followUp === "true";
  const [calls, scripts, contacts] = await Promise.all([
    listCalls(user.id, { followUp: onlyFollowUp }),
    listScripts(user.id),
    listContacts(user.id),
  ]);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Calls</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Place a quick call, or browse every call with its transcript and follow-up flag.
      </p>
      <CallsView
        initialCalls={calls.map(serialize)}
        initialFollowUpOnly={onlyFollowUp}
        scripts={scripts.map((s) => ({ id: s.id, name: s.name }))}
        contacts={contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
      />
    </main>
  );
}

function serialize(c: Awaited<ReturnType<typeof listCalls>>[number]): SerializedCall {
  return {
    id: c.id,
    to_number: c.to_number,
    contact_name: c.contact_name,
    status: c.status,
    transcript: c.transcript,
    duration_seconds: c.duration_seconds,
    needs_follow_up: c.needs_follow_up,
    follow_up_reason: c.follow_up_reason,
    follow_up_score: c.follow_up_score,
    recording_available: c.recording_available,
    error: c.error,
    created_at: c.created_at instanceof Date ? c.created_at.toISOString() : String(c.created_at),
    ended_at: c.ended_at
      ? c.ended_at instanceof Date
        ? c.ended_at.toISOString()
        : String(c.ended_at)
      : null,
    campaign_name: c.campaign_name,
    campaign_id: c.campaign_id,
  };
}
