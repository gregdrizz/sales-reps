import { db } from "@/server/db/client";
import { authUser, badRequest, json } from "@/server/http";
import { contactBulkSchema, contactCreateSchema } from "@/server/validation";

export const runtime = "nodejs";

export async function GET() {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const contacts = await db
    .selectFrom("contacts")
    .selectAll()
    .where("user_id", "=", auth.userId)
    .orderBy("created_at", "desc")
    .execute();

  return json({ contacts });
}

/**
 * Create one contact, or many at once (`{ contacts: [...] }`). Duplicates
 * (same user + phone) are skipped via ON CONFLICT so bulk import is idempotent.
 */
export async function POST(req: Request) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);

  const bulk = contactBulkSchema.safeParse(body);
  const rows = bulk.success
    ? bulk.data.contacts
    : (() => {
        const single = contactCreateSchema.safeParse(body);
        return single.success ? [single.data] : null;
      })();

  if (!rows) return badRequest("Invalid contact payload");

  const inserted = await db
    .insertInto("contacts")
    .values(
      rows.map((c) => ({
        user_id: auth.userId,
        name: c.name,
        phone: c.phone,
        notes: c.notes ?? null,
      })),
    )
    .onConflict((oc) => oc.columns(["user_id", "phone"]).doNothing())
    .returningAll()
    .execute();

  return json({ contacts: inserted, count: inserted.length }, { status: 201 });
}
