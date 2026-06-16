import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getCampaignWithCalls } from "@/server/queries";
import { CampaignLive } from "./CampaignLive";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getCampaignWithCalls(user.id, id);
  if (!data) notFound();

  return (
    <main className="p-8">
      <CampaignLive
        campaignId={id}
        initial={{
          name: data.campaign.name,
          mode: data.campaign.mode,
          status: data.campaign.status,
          scriptName: data.campaign.script_name,
          calls: data.calls.map(serializeCall),
        }}
      />
    </main>
  );
}

// Dates → ISO strings so they cross the server/client boundary cleanly.
function serializeCall(c: Awaited<ReturnType<typeof getCampaignWithCalls>> extends infer T
  ? T extends { calls: (infer R)[] }
    ? R
    : never
  : never) {
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
    summary: c.summary,
    sentiment: c.sentiment,
    next_action: c.next_action,
    recording_available: c.recording_available,
    error: c.error,
    created_at: c.created_at instanceof Date ? c.created_at.toISOString() : String(c.created_at),
    ended_at: c.ended_at
      ? c.ended_at instanceof Date
        ? c.ended_at.toISOString()
        : String(c.ended_at)
      : null,
  };
}
