import { db } from "@/server/db/client";
import { createCampaign } from "@/server/calls/orchestrator";
import { authUser, badRequest, json, serverError } from "@/server/http";
import { campaignCreateSchema } from "@/server/validation";

export const runtime = "nodejs";

export async function GET() {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  // Campaigns with call counts + follow-up tallies.
  const campaigns = await db
    .selectFrom("campaigns")
    .leftJoin("calls", "calls.campaign_id", "campaigns.id")
    .select(({ fn }) => [
      "campaigns.id as id",
      "campaigns.name as name",
      "campaigns.mode as mode",
      "campaigns.status as status",
      "campaigns.script_id as script_id",
      "campaigns.created_at as created_at",
      fn.count<string>("calls.id").as("call_count"),
      fn
        .count<string>("calls.id")
        .filterWhere("calls.needs_follow_up", "=", true)
        .as("follow_up_count"),
    ])
    .where("campaigns.user_id", "=", auth.userId)
    .groupBy("campaigns.id")
    .orderBy("campaigns.created_at", "desc")
    .execute();

  return json({ campaigns });
}

export async function POST(req: Request) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const parsed = campaignCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid campaign", parsed.error.flatten());

  try {
    const { campaign, callCount } = await createCampaign({
      userId: auth.userId,
      scriptId: parsed.data.scriptId,
      name: parsed.data.name,
      mode: parsed.data.mode,
      contactIds: parsed.data.contactIds,
      maxAttempts: parsed.data.maxAttempts,
      retryDelaySeconds: parsed.data.retryDelaySeconds,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      workStartHour: parsed.data.workStartHour ?? null,
      workEndHour: parsed.data.workEndHour ?? null,
      smsOnFollowup: parsed.data.smsOnFollowup,
      smsTemplate: parsed.data.smsTemplate ?? null,
    });
    return json({ campaign, callCount }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    if (message === "Script not found" || message === "No valid contacts selected") {
      return badRequest(message);
    }
    console.error("[campaigns] create failed:", err);
    return serverError();
  }
}
