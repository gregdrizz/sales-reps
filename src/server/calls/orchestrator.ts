import { db } from "@/server/db/client";
import type { Call, Campaign, CampaignMode, VoiceGender } from "@/server/db/types";
import { enqueueDelayed, enqueueJob } from "./queue";
import { processCall } from "./processor";
import { msUntilWorkingHours } from "./schedule";

const PARALLEL_CONCURRENCY = 5;

export interface AdHocCallInput {
  userId: string;
  toNumber: string;
  contactId?: string | null;
  /** Use an existing script's instruction… */
  scriptId?: string | null;
  /** …or supply an inline instruction directly. */
  instruction?: string | null;
  language?: string | null;
  voiceGender?: VoiceGender | null;
  parentCallId?: string | null;
}

/**
 * Place a single ad-hoc ("quick") call not tied to a campaign. The instruction
 * is snapshotted onto the call row so it is self-contained.
 */
export async function createAdHocCall(input: AdHocCallInput): Promise<Call> {
  let instruction = input.instruction?.trim() || null;
  let language = input.language ?? null;
  let voiceGender: VoiceGender = input.voiceGender ?? "female";

  if (!instruction && input.scriptId) {
    const script = await db
      .selectFrom("scripts")
      .select(["instruction", "language", "voice_gender"])
      .where("id", "=", input.scriptId)
      .where("user_id", "=", input.userId)
      .executeTakeFirst();
    if (!script) throw new Error("Script not found");
    instruction = script.instruction;
    if (language == null) language = script.language;
    if (input.voiceGender == null) voiceGender = script.voice_gender;
  }

  if (!instruction) throw new Error("An instruction or script is required");

  const call = await db
    .insertInto("calls")
    .values({
      user_id: input.userId,
      campaign_id: null,
      contact_id: input.contactId ?? null,
      to_number: input.toNumber,
      status: "queued",
      instruction_override: instruction,
      language,
      voice_gender: voiceGender,
      parent_call_id: input.parentCallId ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  await enqueueJob({ type: "call", callId: call.id });
  return call;
}

/** Re-run a past call (same number + instruction), linked via parent_call_id. */
export async function redialCall(userId: string, callId: string): Promise<Call> {
  const original = await db
    .selectFrom("calls")
    .select([
      "to_number",
      "contact_id",
      "campaign_id",
      "instruction_override",
      "language",
      "voice_gender",
    ])
    .where("id", "=", callId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!original) throw new Error("Call not found");

  let instruction = original.instruction_override ?? null;
  let language = original.language ?? null;
  let voiceGender: VoiceGender = original.voice_gender ?? "female";

  if (!instruction && original.campaign_id) {
    const script = await db
      .selectFrom("campaigns")
      .innerJoin("scripts", "scripts.id", "campaigns.script_id")
      .select(["scripts.instruction as instruction", "scripts.language as language", "scripts.voice_gender as voice_gender"])
      .where("campaigns.id", "=", original.campaign_id)
      .executeTakeFirst();
    if (script) {
      instruction = script.instruction;
      language = script.language;
      voiceGender = script.voice_gender;
    }
  }

  return createAdHocCall({
    userId,
    toNumber: original.to_number,
    contactId: original.contact_id,
    instruction,
    language,
    voiceGender,
    parentCallId: callId,
  });
}

export interface CreateCampaignInput {
  userId: string;
  scriptId: string;
  name: string;
  mode: CampaignMode;
  contactIds: string[];
  maxAttempts?: number;
  retryDelaySeconds?: number;
  scheduledAt?: Date | null;
  workStartHour?: number | null;
  workEndHour?: number | null;
  smsOnFollowup?: boolean;
  smsTemplate?: string | null;
}

/**
 * Creates a campaign plus one queued `calls` row per contact, then enqueues a
 * background job to run it. The set of calls *is* the campaign membership.
 */
export async function createCampaign(
  input: CreateCampaignInput,
): Promise<{ campaign: Campaign; callCount: number }> {
  const script = await db
    .selectFrom("scripts")
    .select("id")
    .where("id", "=", input.scriptId)
    .where("user_id", "=", input.userId)
    .executeTakeFirst();
  if (!script) throw new Error("Script not found");

  const contacts = await db
    .selectFrom("contacts")
    .select(["id", "phone"])
    .where("user_id", "=", input.userId)
    .where("id", "in", input.contactIds)
    .execute();
  if (contacts.length === 0) throw new Error("No valid contacts selected");

  const maxAttempts = Math.max(1, input.maxAttempts ?? 1);
  const retryDelaySeconds = Math.max(0, input.retryDelaySeconds ?? 300);
  const future = input.scheduledAt && input.scheduledAt.getTime() > Date.now();

  const campaign = await db.transaction().execute(async (trx) => {
    const created = await trx
      .insertInto("campaigns")
      .values({
        user_id: input.userId,
        script_id: input.scriptId,
        name: input.name,
        mode: input.mode,
        status: "pending",
        scheduled_at: future ? input.scheduledAt : null,
        max_attempts: maxAttempts,
        retry_delay_seconds: retryDelaySeconds,
        work_start_hour: input.workStartHour ?? null,
        work_end_hour: input.workEndHour ?? null,
        sms_on_followup: input.smsOnFollowup ?? false,
        sms_template: input.smsTemplate ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("calls")
      .values(
        contacts.map((c) => ({
          user_id: input.userId,
          campaign_id: created.id,
          contact_id: c.id,
          to_number: c.phone,
          status: "queued" as const,
          max_attempts: maxAttempts,
          retry_delay_seconds: retryDelaySeconds,
        })),
      )
      .execute();

    return created;
  });

  // Future-scheduled campaigns are picked up by the worker's scheduler tick.
  if (!future) await enqueueJob({ type: "campaign", campaignId: campaign.id });
  return { campaign, callCount: contacts.length };
}

/**
 * Claim campaigns whose scheduled time has arrived and enqueue them. Nulling
 * `scheduled_at` in the same UPDATE acts as the claim so the scheduler tick
 * never enqueues the same campaign twice. Returns how many were started.
 */
export async function claimDueScheduledCampaigns(): Promise<number> {
  const due = await db
    .updateTable("campaigns")
    .set({ scheduled_at: null })
    .where("status", "=", "pending")
    .where("scheduled_at", "is not", null)
    .where("scheduled_at", "<=", new Date())
    .returning("id")
    .execute();

  for (const c of due) await enqueueJob({ type: "campaign", campaignId: c.id });
  return due.length;
}

async function runPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (index < items.length) {
        const current = index++;
        await fn(items[current]);
      }
    },
  );
  await Promise.all(workers);
}

/** Worker entry point for a campaign job. */
export async function processCampaign(campaignId: string): Promise<void> {
  const campaign = await db
    .selectFrom("campaigns")
    .select(["id", "mode", "work_start_hour", "work_end_hour"])
    .where("id", "=", campaignId)
    .executeTakeFirst();
  if (!campaign) {
    console.error(`[orchestrator] campaign ${campaignId} not found`);
    return;
  }

  // Respect the working-hours window: if we're outside it, defer the whole
  // campaign job to the next window start (status stays pending).
  const wait = msUntilWorkingHours(campaign.work_start_hour, campaign.work_end_hour);
  if (wait > 0) {
    console.log(
      `[orchestrator] campaign ${campaignId} outside working hours → deferring ${Math.round(wait / 60000)}m`,
    );
    await enqueueDelayed({ type: "campaign", campaignId }, wait);
    return;
  }

  await db
    .updateTable("campaigns")
    .set({ status: "running" })
    .where("id", "=", campaignId)
    .execute();

  const calls = await db
    .selectFrom("calls")
    .select("id")
    .where("campaign_id", "=", campaignId)
    .where("status", "=", "queued")
    .orderBy("created_at", "asc")
    .execute();

  const ids = calls.map((c) => c.id);
  console.log(
    `[orchestrator] campaign ${campaignId} (${campaign.mode}) → ${ids.length} calls`,
  );

  if (campaign.mode === "sequential") {
    for (const id of ids) await processCall(id);
  } else {
    await runPool(ids, PARALLEL_CONCURRENCY, processCall);
  }

  // A campaign "fails" only if every call ended in failure.
  const failed = await db
    .selectFrom("calls")
    .select(({ fn }) => fn.countAll<string>().as("n"))
    .where("campaign_id", "=", campaignId)
    .where("status", "=", "failed")
    .executeTakeFirst();
  const failedCount = Number(failed?.n ?? 0);

  await db
    .updateTable("campaigns")
    .set({ status: failedCount === ids.length && ids.length > 0 ? "failed" : "completed" })
    .where("id", "=", campaignId)
    .execute();

  console.log(`[orchestrator] campaign ${campaignId} done`);
}
