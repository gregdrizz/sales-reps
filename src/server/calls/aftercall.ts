import { db } from "@/server/db/client";
import { sendSms } from "@/server/sms";

/**
 * Runs once a call is finalized: if it was flagged for follow-up, create a
 * follow-up task (idempotent per call) and, when the campaign opts in,
 * auto-send a templated SMS. Safe to call from both the worker's processor and
 * the reconcile/webhook path.
 */
export async function handleFollowUp(callId: string): Promise<void> {
  const call = await db
    .selectFrom("calls")
    .leftJoin("contacts", "contacts.id", "calls.contact_id")
    .leftJoin("campaigns", "campaigns.id", "calls.campaign_id")
    .select([
      "calls.id as id",
      "calls.user_id as user_id",
      "calls.contact_id as contact_id",
      "calls.to_number as to_number",
      "calls.needs_follow_up as needs_follow_up",
      "calls.follow_up_reason as follow_up_reason",
      "contacts.name as contact_name",
      "campaigns.sms_on_followup as sms_on_followup",
      "campaigns.sms_template as sms_template",
    ])
    .where("calls.id", "=", callId)
    .executeTakeFirst();

  if (!call || !call.needs_follow_up) return;

  const who = call.contact_name ?? call.to_number;

  // 1. Create a follow-up task (unique index on call_id makes this idempotent).
  await db
    .insertInto("follow_up_tasks")
    .values({
      user_id: call.user_id,
      call_id: call.id,
      contact_id: call.contact_id,
      title: `Follow up with ${who}`,
      notes: call.follow_up_reason,
      status: "open",
    })
    .onConflict((oc) => oc.column("call_id").doNothing())
    .execute();

  // 2. Auto-SMS if the campaign opted in and provided a template.
  if (call.sms_on_followup && call.sms_template?.trim()) {
    const body = call.sms_template.replaceAll("{{name}}", call.contact_name ?? "there");
    try {
      await sendSms({
        userId: call.user_id,
        toNumber: call.to_number,
        body,
        contactId: call.contact_id,
        callId: call.id,
      });
    } catch (err) {
      console.error("[aftercall] auto-SMS failed:", err);
    }
  }
}
