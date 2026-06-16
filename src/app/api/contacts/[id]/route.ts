import { db } from "@/server/db/client";
import { authUser, badRequest, json, notFound } from "@/server/http";
import { contactCreateSchema } from "@/server/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = contactCreateSchema
    .partial()
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid contact", parsed.error.flatten());

  const { name, phone, notes } = parsed.data;
  const updated = await db
    .updateTable("contacts")
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(notes !== undefined ? { notes: notes ?? null } : {}),
    })
    .where("id", "=", id)
    .where("user_id", "=", auth.userId)
    .returningAll()
    .executeTakeFirst();

  if (!updated) return notFound("Contact not found");
  return json({ contact: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const result = await db
    .deleteFrom("contacts")
    .where("id", "=", id)
    .where("user_id", "=", auth.userId)
    .executeTakeFirst();

  if (!result.numDeletedRows) return notFound("Contact not found");
  return json({ ok: true });
}
