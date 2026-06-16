import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // SMS messages (outbound now; inbound-ready for a future webhook).
  await db.schema
    .createTable("messages")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "text", (c) =>
      c.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("contact_id", "uuid", (c) => c.references("contacts.id").onDelete("set null"))
    .addColumn("call_id", "uuid", (c) => c.references("calls.id").onDelete("set null"))
    .addColumn("to_number", "text", (c) => c.notNull())
    .addColumn("body", "text", (c) => c.notNull())
    .addColumn("direction", "text", (c) => c.notNull().defaultTo("outbound"))
    .addColumn("dial_message_id", "text")
    .addColumn("status", "text", (c) => c.notNull().defaultTo("sent"))
    .addColumn("error", "text")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // Follow-up task queue.
  await db.schema
    .createTable("follow_up_tasks")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "text", (c) =>
      c.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("call_id", "uuid", (c) => c.references("calls.id").onDelete("set null"))
    .addColumn("contact_id", "uuid", (c) => c.references("contacts.id").onDelete("set null"))
    .addColumn("title", "text", (c) => c.notNull())
    .addColumn("notes", "text")
    .addColumn("status", "text", (c) => c.notNull().defaultTo("open"))
    .addColumn("due_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("completed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("tasks_user_status_idx")
    .on("follow_up_tasks")
    .columns(["user_id", "status"])
    .execute();

  // One auto-task per call (so reconcile + processor don't double-create).
  // Postgres treats NULLs as distinct, so manual tasks (null call_id) are fine.
  await db.schema
    .createIndex("tasks_call_unique")
    .on("follow_up_tasks")
    .column("call_id")
    .unique()
    .execute();

  // Auto-SMS on follow-up config.
  await db.schema
    .alterTable("campaigns")
    .addColumn("sms_on_followup", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("sms_template", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("campaigns")
    .dropColumn("sms_on_followup")
    .dropColumn("sms_template")
    .execute();
  await db.schema.dropTable("follow_up_tasks").ifExists().execute();
  await db.schema.dropTable("messages").ifExists().execute();
}
