import { db } from "@/server/db/client";
import { getDialClient } from "@/server/dial/client";
import { getFollowUpAnalyzer } from "@/server/followup";
import { handleFollowUp } from "./aftercall";
import { isTerminal, mapDialStatus } from "./status";

/**
 * Fetch the authoritative call state from Dial and update our row. Used by the
 * on-demand sync endpoint and the webhook receiver (the worker uses its own
 * polling loop in the processor). Returns true if the row reached a terminal
 * state during this reconcile.
 */
export async function reconcileCallRow(
  callId: string,
  dialCallId: string,
): Promise<boolean> {
  const dial = getDialClient();
  const c = await dial.getCall(dialCallId);
  const status = mapDialStatus(c.status);
  const transcript = c.transcript ?? null;

  if (isTerminal(status)) {
    const verdict = await getFollowUpAnalyzer().analyze({ transcript, status });
    await db
      .updateTable("calls")
      .set({
        status,
        transcript,
        duration_seconds: c.duration ?? null,
        recording_available: Boolean(c.recordingAvailable),
        needs_follow_up: verdict.needsFollowUp,
        follow_up_reason: verdict.reason,
        follow_up_score: verdict.score,
        summary: verdict.summary ?? null,
        sentiment: verdict.sentiment ?? null,
        next_action: verdict.nextAction ?? null,
        ended_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", callId)
      .execute();
    await handleFollowUp(callId);
    return true;
  }

  await db
    .updateTable("calls")
    .set({ status, updated_at: new Date() })
    .where("id", "=", callId)
    .execute();
  return false;
}

/** Look up a call row by its Dial call id and reconcile it (webhook path). */
export async function reconcileByDialCallId(dialCallId: string): Promise<void> {
  const row = await db
    .selectFrom("calls")
    .select(["id"])
    .where("dial_call_id", "=", dialCallId)
    .executeTakeFirst();
  if (!row) return;
  await reconcileCallRow(row.id, dialCallId);
}
