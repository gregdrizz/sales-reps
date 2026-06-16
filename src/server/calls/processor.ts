import { db } from "@/server/db/client";
import type { CallStatus } from "@/server/db/types";
import { DialApiError, getDialClient, isTerminalDialStatus } from "@/server/dial/client";
import { getFollowUpAnalyzer } from "@/server/followup";
import { isTerminal, mapDialStatus } from "./status";

const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 12 * 60_000; // 12 minutes
const TRANSCRIPT_RETRIES = 5;
const TRANSCRIPT_RETRY_MS = 2_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface CallContext {
  id: string;
  to_number: string;
  instruction: string;
  language: string | null;
  voice_gender: "female" | "male";
}

async function loadCallContext(callId: string): Promise<CallContext | null> {
  const call = await db
    .selectFrom("calls")
    .select([
      "id",
      "to_number",
      "campaign_id",
      "instruction_override",
      "language",
      "voice_gender",
    ])
    .where("id", "=", callId)
    .executeTakeFirst();
  if (!call) return null;

  // Ad-hoc / quick call: instruction travels on the call row itself.
  if (call.instruction_override) {
    return {
      id: call.id,
      to_number: call.to_number,
      instruction: call.instruction_override,
      language: call.language,
      voice_gender: call.voice_gender ?? "female",
    };
  }

  // Campaign call: resolve the instruction from the campaign's script.
  if (call.campaign_id) {
    const row = await db
      .selectFrom("campaigns")
      .innerJoin("scripts", "scripts.id", "campaigns.script_id")
      .select([
        "scripts.instruction as instruction",
        "scripts.language as language",
        "scripts.voice_gender as voice_gender",
      ])
      .where("campaigns.id", "=", call.campaign_id)
      .executeTakeFirst();
    if (!row) return null;
    return {
      id: call.id,
      to_number: call.to_number,
      instruction: row.instruction,
      language: row.language,
      voice_gender: row.voice_gender,
    };
  }

  return null;
}

async function setStatus(callId: string, status: CallStatus): Promise<void> {
  await db
    .updateTable("calls")
    .set({ status, updated_at: new Date() })
    .where("id", "=", callId)
    .execute();
}

/**
 * Places one call through Dial, polls it to completion, stores the transcript,
 * and runs the follow-up analyzer. Idempotent dial via the call row id, so a
 * retried job never double-dials. Errors are recorded on the row, not thrown.
 */
export async function processCall(callId: string): Promise<void> {
  const ctx = await loadCallContext(callId);
  if (!ctx) {
    console.error(`[processor] call ${callId} not found / missing script`);
    return;
  }

  const dial = getDialClient();

  try {
    await setStatus(callId, "dialing");

    const placed = await dial.placeCall({
      to: ctx.to_number,
      outboundInstruction: ctx.instruction,
      language: ctx.language,
      voiceGender: ctx.voice_gender,
      idempotencyKey: callId,
    });

    await db
      .updateTable("calls")
      .set({
        dial_call_id: placed.id,
        status: mapDialStatus(placed.status),
        updated_at: new Date(),
      })
      .where("id", "=", callId)
      .execute();

    // Poll until terminal or timeout.
    const start = Date.now();
    let current = placed;
    while (!isTerminalDialStatus(current.status) && Date.now() - start < MAX_WAIT_MS) {
      await sleep(POLL_INTERVAL_MS);
      current = await dial.getCall(placed.id);
      const mapped = mapDialStatus(current.status);
      if (!isTerminal(mapped)) await setStatus(callId, mapped);
    }

    // Transcript can finalize slightly after the call reaches a terminal state.
    let transcript = current.transcript ?? null;
    for (let i = 0; i < TRANSCRIPT_RETRIES && !transcript; i++) {
      await sleep(TRANSCRIPT_RETRY_MS);
      current = await dial.getCall(placed.id);
      transcript = current.transcript ?? null;
    }

    const finalStatus = mapDialStatus(current.status);
    const analyzer = getFollowUpAnalyzer();
    const verdict = await analyzer.analyze({ transcript, status: finalStatus });

    await db
      .updateTable("calls")
      .set({
        status: finalStatus,
        transcript,
        duration_seconds: current.duration ?? null,
        recording_available: Boolean(current.recordingAvailable),
        needs_follow_up: verdict.needsFollowUp,
        follow_up_reason: verdict.reason,
        follow_up_score: verdict.score,
        error: null,
        ended_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", callId)
      .execute();
  } catch (err) {
    const message =
      err instanceof DialApiError
        ? `Dial API ${err.status}: ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
    console.error(`[processor] call ${callId} failed: ${message}`);
    await db
      .updateTable("calls")
      .set({ status: "failed", error: message, ended_at: new Date(), updated_at: new Date() })
      .where("id", "=", callId)
      .execute();
  }
}
