import { db } from "@/server/db/client";
import { authUser, json, notFound } from "@/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const campaign = await db
    .selectFrom("campaigns")
    .selectAll()
    .where("id", "=", id)
    .where("user_id", "=", auth.userId)
    .executeTakeFirst();

  if (!campaign) return notFound("Campaign not found");

  const calls = await db
    .selectFrom("calls")
    .leftJoin("contacts", "contacts.id", "calls.contact_id")
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
    ])
    .where("calls.campaign_id", "=", id)
    .orderBy("calls.created_at", "asc")
    .execute();

  return json({ campaign, calls });
}
