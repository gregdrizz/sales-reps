import { db } from "@/server/db/client";
import { authUser, json } from "@/server/http";

export const runtime = "nodejs";

/**
 * List the signed-in rep's calls. Optional filters:
 *   ?followUp=true     only calls flagged for follow-up
 *   ?campaignId=<uuid> only calls in a campaign
 *   ?limit=<n>         cap (default 200)
 */
export async function GET(req: Request) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const followUp = url.searchParams.get("followUp") === "true";
  const campaignId = url.searchParams.get("campaignId");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 1000);

  let q = db
    .selectFrom("calls")
    .leftJoin("contacts", "contacts.id", "calls.contact_id")
    .leftJoin("campaigns", "campaigns.id", "calls.campaign_id")
    .select([
      "calls.id as id",
      "calls.to_number as to_number",
      "calls.status as status",
      "calls.transcript as transcript",
      "calls.duration_seconds as duration_seconds",
      "calls.needs_follow_up as needs_follow_up",
      "calls.follow_up_reason as follow_up_reason",
      "calls.follow_up_score as follow_up_score",
      "calls.recording_available as recording_available",
      "calls.error as error",
      "calls.created_at as created_at",
      "calls.ended_at as ended_at",
      "contacts.name as contact_name",
      "campaigns.name as campaign_name",
      "calls.campaign_id as campaign_id",
    ])
    .where("calls.user_id", "=", auth.userId)
    .orderBy("calls.created_at", "desc")
    .limit(limit);

  if (followUp) q = q.where("calls.needs_follow_up", "=", true);
  if (campaignId) q = q.where("calls.campaign_id", "=", campaignId);

  const calls = await q.execute();
  return json({ calls });
}
