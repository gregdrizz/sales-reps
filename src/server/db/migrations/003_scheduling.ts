import { Kysely } from "kysely";

// Scheduling + auto-redial config. Lives on the campaign (the knobs the user
// sets) and is copied onto each call row (the unit that actually retries), so
// ad-hoc calls and redials are self-contained.

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("campaigns")
    .addColumn("scheduled_at", "timestamptz")
    .addColumn("max_attempts", "integer", (c) => c.notNull().defaultTo(1))
    .addColumn("retry_delay_seconds", "integer", (c) => c.notNull().defaultTo(300))
    .addColumn("work_start_hour", "integer")
    .addColumn("work_end_hour", "integer")
    .execute();

  await db.schema
    .alterTable("calls")
    .addColumn("retry_delay_seconds", "integer", (c) => c.notNull().defaultTo(300))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("campaigns")
    .dropColumn("scheduled_at")
    .dropColumn("max_attempts")
    .dropColumn("retry_delay_seconds")
    .dropColumn("work_start_hour")
    .dropColumn("work_end_hour")
    .execute();
  await db.schema.alterTable("calls").dropColumn("retry_delay_seconds").execute();
}
