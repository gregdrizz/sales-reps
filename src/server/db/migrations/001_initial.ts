import { Kysely, sql } from "kysely";

// Uses Postgres 13+ built-in gen_random_uuid(). Identifiers are quoted by
// Kysely, so the camelCase better-auth columns are preserved case-sensitively.

export async function up(db: Kysely<unknown>): Promise<void> {
  // ─── better-auth: user ─────────────────────────────────────────────────────
  await db.schema
    .createTable("user")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("email", "text", (c) => c.notNull().unique())
    .addColumn("emailVerified", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("image", "text")
    .addColumn("username", "text", (c) => c.unique())
    .addColumn("displayUsername", "text")
    .addColumn("createdAt", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updatedAt", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // ─── better-auth: session ──────────────────────────────────────────────────
  await db.schema
    .createTable("session")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("expiresAt", "timestamptz", (c) => c.notNull())
    .addColumn("token", "text", (c) => c.notNull().unique())
    .addColumn("ipAddress", "text")
    .addColumn("userAgent", "text")
    .addColumn("userId", "text", (c) =>
      c.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("createdAt", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updatedAt", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // ─── better-auth: account (stores the password hash for credential login) ──
  await db.schema
    .createTable("account")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("accountId", "text", (c) => c.notNull())
    .addColumn("providerId", "text", (c) => c.notNull())
    .addColumn("userId", "text", (c) =>
      c.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("accessToken", "text")
    .addColumn("refreshToken", "text")
    .addColumn("idToken", "text")
    .addColumn("accessTokenExpiresAt", "timestamptz")
    .addColumn("refreshTokenExpiresAt", "timestamptz")
    .addColumn("scope", "text")
    .addColumn("password", "text")
    .addColumn("createdAt", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updatedAt", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // ─── better-auth: verification ─────────────────────────────────────────────
  await db.schema
    .createTable("verification")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("identifier", "text", (c) => c.notNull())
    .addColumn("value", "text", (c) => c.notNull())
    .addColumn("expiresAt", "timestamptz", (c) => c.notNull())
    .addColumn("createdAt", "timestamptz", (c) => c.defaultTo(sql`now()`))
    .addColumn("updatedAt", "timestamptz", (c) => c.defaultTo(sql`now()`))
    .execute();

  // ─── app: scripts (a.k.a. transcripts) ─────────────────────────────────────
  await db.schema
    .createTable("scripts")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "text", (c) =>
      c.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("instruction", "text", (c) => c.notNull())
    .addColumn("language", "text")
    .addColumn("voice_gender", "text", (c) => c.notNull().defaultTo("female"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // ─── app: contacts ─────────────────────────────────────────────────────────
  await db.schema
    .createTable("contacts")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "text", (c) =>
      c.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("phone", "text", (c) => c.notNull())
    .addColumn("notes", "text")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("contacts_user_phone_unique", ["user_id", "phone"])
    .execute();

  // ─── app: campaigns ────────────────────────────────────────────────────────
  await db.schema
    .createTable("campaigns")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "text", (c) =>
      c.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("script_id", "uuid", (c) =>
      c.notNull().references("scripts.id").onDelete("restrict"),
    )
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("mode", "text", (c) => c.notNull())
    .addColumn("status", "text", (c) => c.notNull().defaultTo("pending"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // ─── app: calls ────────────────────────────────────────────────────────────
  await db.schema
    .createTable("calls")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "text", (c) =>
      c.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("campaign_id", "uuid", (c) =>
      c.references("campaigns.id").onDelete("set null"),
    )
    .addColumn("contact_id", "uuid", (c) =>
      c.references("contacts.id").onDelete("set null"),
    )
    .addColumn("dial_call_id", "text")
    .addColumn("to_number", "text", (c) => c.notNull())
    .addColumn("status", "text", (c) => c.notNull().defaultTo("queued"))
    .addColumn("transcript", "text")
    .addColumn("duration_seconds", "integer")
    .addColumn("needs_follow_up", "boolean")
    .addColumn("follow_up_reason", "text")
    .addColumn("follow_up_score", "real")
    .addColumn("recording_available", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("error", "text")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("ended_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("calls_campaign_idx")
    .on("calls")
    .column("campaign_id")
    .execute();
  await db.schema
    .createIndex("calls_dial_call_id_idx")
    .on("calls")
    .column("dial_call_id")
    .execute();
  await db.schema
    .createIndex("calls_user_created_idx")
    .on("calls")
    .columns(["user_id", "created_at"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("calls").ifExists().execute();
  await db.schema.dropTable("campaigns").ifExists().execute();
  await db.schema.dropTable("contacts").ifExists().execute();
  await db.schema.dropTable("scripts").ifExists().execute();
  await db.schema.dropTable("verification").ifExists().execute();
  await db.schema.dropTable("account").ifExists().execute();
  await db.schema.dropTable("session").ifExists().execute();
  await db.schema.dropTable("user").ifExists().execute();
}
