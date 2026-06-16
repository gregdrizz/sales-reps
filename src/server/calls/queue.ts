import { getRedis } from "@/server/redis";

export const JOBS_KEY = "salesreps:jobs";
export const DELAYED_KEY = "salesreps:delayed";

export type Job =
  | { type: "campaign"; campaignId: string }
  | { type: "call"; callId: string };

/** Push a job onto the FIFO queue (LPUSH + worker BRPOP = FIFO). */
export async function enqueueJob(job: Job): Promise<void> {
  await getRedis().lpush(JOBS_KEY, JSON.stringify(job));
}

/** Schedule a job to run after `delayMs` (stored in a Redis ZSET by run-at). */
export async function enqueueDelayed(job: Job, delayMs: number): Promise<void> {
  const runAt = Date.now() + Math.max(0, delayMs);
  await getRedis().zadd(DELAYED_KEY, runAt, JSON.stringify(job));
}

/**
 * Move any delayed jobs whose time has come onto the main queue. Returns how
 * many were promoted. ZREM acts as the claim so concurrent ticks don't double
 * promote the same job.
 */
export async function promoteDueDelayed(): Promise<number> {
  const redis = getRedis();
  const due = await redis.zrangebyscore(DELAYED_KEY, 0, Date.now());
  let moved = 0;
  for (const member of due) {
    const removed = await redis.zrem(DELAYED_KEY, member);
    if (removed === 1) {
      await redis.lpush(JOBS_KEY, member);
      moved++;
    }
  }
  return moved;
}
