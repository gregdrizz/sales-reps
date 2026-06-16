import { Kysely } from "kysely";

// AI-generated call insights (populated when an LLM analyzer is enabled).

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("calls")
    .addColumn("summary", "text")
    .addColumn("sentiment", "text")
    .addColumn("next_action", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("calls")
    .dropColumn("summary")
    .dropColumn("sentiment")
    .dropColumn("next_action")
    .execute();
}
