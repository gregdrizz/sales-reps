import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { getEnv } from "@/server/env";
import type { Database } from "./types";

// Reuse a single pool/Kysely instance across hot reloads in dev.
const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
  __db?: Kysely<Database>;
};

export function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    globalForDb.__pgPool = new Pool({
      connectionString: getEnv().DATABASE_URL,
      max: 10,
    });
  }
  return globalForDb.__pgPool;
}

export function getDb(): Kysely<Database> {
  if (!globalForDb.__db) {
    globalForDb.__db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: getPool() }),
    });
  }
  return globalForDb.__db;
}

export const db = getDb();
