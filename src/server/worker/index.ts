import { db } from "@/server/db/client";
import { createRedisConnection } from "@/server/redis";
import { claimDueScheduledCampaigns, processCampaign } from "@/server/calls/orchestrator";
import { processCall } from "@/server/calls/processor";
import { JOBS_KEY, promoteDueDelayed, type Job } from "@/server/calls/queue";

// Standalone background worker. Drains the Redis job queue and runs each job to
// completion. Run with `npm run worker` alongside `npm run dev`.

const SCHEDULER_INTERVAL_MS = 10_000;
let running = true;

async function handle(job: Job): Promise<void> {
  if (job.type === "campaign") {
    await processCampaign(job.campaignId);
  } else if (job.type === "call") {
    await processCall(job.callId);
  }
}

/** Periodic tick: promote due delayed jobs and start due scheduled campaigns. */
async function schedulerTick() {
  try {
    const promoted = await promoteDueDelayed();
    const started = await claimDueScheduledCampaigns();
    if (promoted || started) {
      console.log(`[scheduler] promoted ${promoted} delayed, started ${started} scheduled`);
    }
  } catch (err) {
    console.error("[scheduler] tick error:", err);
  }
}

async function main() {
  const conn = createRedisConnection();
  console.log(`[worker] listening on "${JOBS_KEY}" …`);

  const scheduler = setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
  void schedulerTick();

  while (running) {
    try {
      // BRPOP blocks up to 5s; LPUSH + BRPOP gives FIFO ordering.
      const result = await conn.brpop(JOBS_KEY, 5);
      if (!result) continue;
      const [, payload] = result;
      let job: Job;
      try {
        job = JSON.parse(payload) as Job;
      } catch {
        console.error(`[worker] bad job payload: ${payload}`);
        continue;
      }
      console.log(`[worker] handling ${job.type} job`);
      await handle(job);
    } catch (err) {
      console.error("[worker] loop error:", err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  clearInterval(scheduler);
  await conn.quit();
  await db.destroy();
}

async function shutdown() {
  console.log("\n[worker] shutting down …");
  running = false;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
