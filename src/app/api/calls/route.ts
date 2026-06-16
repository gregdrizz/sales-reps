import { db } from "@/server/db/client";
import { createAdHocCall } from "@/server/calls/orchestrator";
import { authUser, badRequest, json, serverError } from "@/server/http";
import { adhocCallSchema } from "@/server/validation";

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

/** Place a single ad-hoc ("quick") call. */
export async function POST(req: Request) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const parsed = adhocCallSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid call", parsed.error.flatten());

  // Resolve the destination number from a contact if one was given.
  let toNumber = parsed.data.toNumber ?? null;
  let contactId = parsed.data.contactId ?? null;
  if (contactId) {
    const contact = await db
      .selectFrom("contacts")
      .select(["id", "phone"])
      .where("id", "=", contactId)
      .where("user_id", "=", auth.userId)
      .executeTakeFirst();
    if (!contact) return badRequest("Contact not found");
    toNumber = contact.phone;
  }
  if (!toNumber) return badRequest("No destination number");

  try {
    const call = await createAdHocCall({
      userId: auth.userId,
      toNumber,
      contactId,
      scriptId: parsed.data.scriptId ?? null,
      instruction: parsed.data.instruction ?? null,
      language: parsed.data.language ?? null,
      voiceGender: parsed.data.voiceGender ?? null,
    });
    return json({ call }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place call";
    if (message === "Script not found" || message === "An instruction or script is required") {
      return badRequest(message);
    }
    console.error("[calls] adhoc create failed:", err);
    return serverError();
  }
}
