import { db } from "@/server/db/client";
import type { Campaign, CampaignMode } from "@/server/db/types";
import { enqueueJob } from "./queue";
import { processCall } from "./processor";

const PARALLEL_CONCURRENCY = 5;

export interface CreateCampaignInput {
  userId: string;
  scriptId: string;
  name: string;
  mode: CampaignMode;
  contactIds: string[];
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

  const campaign = await db.transaction().execute(async (trx) => {
    const created = await trx
      .insertInto("campaigns")
      .values({
        user_id: input.userId,
        script_id: input.scriptId,
        name: input.name,
        mode: input.mode,
        status: "pending",
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
        })),
      )
      .execute();

    return created;
  });

  await enqueueJob({ type: "campaign", campaignId: campaign.id });
  return { campaign, callCount: contacts.length };
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
    .select(["id", "mode"])
    .where("id", "=", campaignId)
    .executeTakeFirst();
  if (!campaign) {
    console.error(`[orchestrator] campaign ${campaignId} not found`);
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
