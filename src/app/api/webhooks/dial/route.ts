import { reconcileByDialCallId } from "@/server/calls/reconcile";
import { getEnv } from "@/server/env";
import { badRequest, json, unauthorized } from "@/server/http";

export const runtime = "nodejs";

/**
 * Receiver for Dial events (`call.ended`, `call.transcribed`). Registering this
 * URL as a Dial webhook makes call results update in real time instead of only
 * via the worker's polling. Optional shared-secret check via DIAL_WEBHOOK_SECRET
 * (sent as `x-dial-secret` or `Authorization: Bearer <secret>`).
 *
 * On any matching event we re-fetch the authoritative call from Dial rather
 * than trusting the payload, so an unauthenticated ping can at most trigger a
 * read of our own data.
 */
export async function POST(req: Request) {
  const secret = getEnv().DIAL_WEBHOOK_SECRET;
  if (secret) {
    const header =
      req.headers.get("x-dial-secret") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      "";
    if (header !== secret) return unauthorized();
  }

  const body = (await req.json().catch(() => null)) as
    | { type?: string; data?: { callId?: string }; relatedObject?: { id?: string } }
    | null;
  if (!body) return badRequest("Invalid payload");

  const callId = body.data?.callId ?? body.relatedObject?.id;
  if (!callId) return json({ ok: true, ignored: "no callId" });

  try {
    await reconcileByDialCallId(callId);
  } catch (err) {
    console.error("[webhook] reconcile failed:", err);
  }

  return json({ ok: true });
}
