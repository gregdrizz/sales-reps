import { Kysely, sql } from "kysely";

// Support ad-hoc (manual / quick) calls that don't belong to a campaign and
// carry their own instruction + voice, plus redial lineage and attempt counts.

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("calls")
    .addColumn("instruction_override", "text")
    .addColumn("language", "text")
    .addColumn("voice_gender", "text")
    .addColumn("attempt", "integer", (c) => c.notNull().defaultTo(1))
    .addColumn("max_attempts", "integer", (c) => c.notNull().defaultTo(1))
    .addColumn("parent_call_id", "uuid")
    .execute();

  await db.schema
    .alterTable("calls")
    .addForeignKeyConstraint(
      "calls_parent_call_fk",
      ["parent_call_id"],
      "calls",
      ["id"],
    )
    .onDelete("set null")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("calls").dropConstraint("calls_parent_call_fk").execute();
  await db.schema
    .alterTable("calls")
    .dropColumn("instruction_override")
    .dropColumn("language")
    .dropColumn("voice_gender")
    .dropColumn("attempt")
    .dropColumn("max_attempts")
    .dropColumn("parent_call_id")
    .execute();
  void sql;
}
