import { db } from "@/server/db/client";
import { authUser, badRequest, json, serverError } from "@/server/http";
import { sendSms } from "@/server/sms";
import { smsSendSchema } from "@/server/validation";

export const runtime = "nodejs";

export async function GET() {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const messages = await db
    .selectFrom("messages")
    .selectAll()
    .where("user_id", "=", auth.userId)
    .orderBy("created_at", "desc")
    .limit(500)
    .execute();

  return json({ messages });
}

export async function POST(req: Request) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const parsed = smsSendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid message", parsed.error.flatten());

  let toNumber = parsed.data.toNumber ?? null;
  const contactId = parsed.data.contactId ?? null;
  if (contactId) {
    const contact = await db
      .selectFrom("contacts")
      .select(["phone"])
      .where("id", "=", contactId)
      .where("user_id", "=", auth.userId)
      .executeTakeFirst();
    if (!contact) return badRequest("Contact not found");
    toNumber = contact.phone;
  }
  if (!toNumber) return badRequest("No destination number");

  try {
    const message = await sendSms({
      userId: auth.userId,
      toNumber,
      body: parsed.data.body,
      contactId,
      callId: parsed.data.callId ?? null,
    });
    return json({ message }, { status: 201 });
  } catch (err) {
    console.error("[messages] send failed:", err);
    return serverError();
  }
}
