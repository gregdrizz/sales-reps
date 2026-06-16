import { db } from "@/server/db/client";
import { reconcileCallRow } from "@/server/calls/reconcile";
import { authUser, json } from "@/server/http";

export const runtime = "nodejs";

/**
 * Reconcile non-terminal calls with Dial on demand. The worker normally keeps
 * rows current; this lets the UI force a refresh (e.g. if the worker was down).
 */
export async function POST() {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const pending = await db
    .selectFrom("calls")
    .select(["id", "dial_call_id"])
    .where("user_id", "=", auth.userId)
    .where("status", "in", ["dialing", "in_progress"])
    .where("dial_call_id", "is not", null)
    .execute();

  let updated = 0;
  for (const row of pending) {
    if (!row.dial_call_id) continue;
    try {
      await reconcileCallRow(row.id, row.dial_call_id);
      updated++;
    } catch (err) {
      console.error(`[sync] call ${row.id} failed:`, err);
    }
  }

  return json({ checked: pending.length, updated });
}
