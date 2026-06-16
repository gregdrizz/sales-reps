import { db } from "@/server/db/client";
import { getDialClient } from "@/server/dial/client";
import type { Message } from "@/server/db/types";

export interface SendSmsInput {
  userId: string;
  toNumber: string;
  body: string;
  contactId?: string | null;
  callId?: string | null;
}

/**
 * Send an SMS via Dial and record it. The message row is written either way so
 * failures are visible; status reflects the outcome.
 */
export async function sendSms(input: SendSmsInput): Promise<Message> {
  const dial = getDialClient();
  let dialMessageId: string | null = null;
  let status = "sent";
  let error: string | null = null;

  try {
    const res = (await dial.sendMessage({ to: input.toNumber, body: input.body })) as
      | { message?: { id?: string }; id?: string }
      | null;
    dialMessageId = res?.message?.id ?? res?.id ?? null;
  } catch (err) {
    status = "failed";
    error = err instanceof Error ? err.message : String(err);
    console.error("[sms] send failed:", error);
  }

  return db
    .insertInto("messages")
    .values({
      user_id: input.userId,
      contact_id: input.contactId ?? null,
      call_id: input.callId ?? null,
      to_number: input.toNumber,
      body: input.body,
      direction: "outbound",
      dial_message_id: dialMessageId,
      status,
      error,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
