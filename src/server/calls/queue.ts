import { getRedis } from "@/server/redis";

export const JOBS_KEY = "salesreps:jobs";

export type Job =
  | { type: "campaign"; campaignId: string }
  | { type: "call"; callId: string };

/** Push a job onto the FIFO queue (LPUSH + worker BRPOP = FIFO). */
export async function enqueueJob(job: Job): Promise<void> {
  await getRedis().lpush(JOBS_KEY, JSON.stringify(job));
}
