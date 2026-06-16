import Redis from "ioredis";
import { getEnv } from "@/server/env";

const globalForRedis = globalThis as unknown as {
  __redis?: Redis;
};

/**
 * Shared ioredis connection. `maxRetriesPerRequest: null` is required for using
 * the same connection with blocking commands (BRPOPLPUSH) in the worker.
 */
export function getRedis(): Redis {
  if (!globalForRedis.__redis) {
    globalForRedis.__redis = new Redis(getEnv().REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
  }
  return globalForRedis.__redis;
}

/** A dedicated connection — used by the worker for blocking pops. */
export function createRedisConnection(): Redis {
  return new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
}
