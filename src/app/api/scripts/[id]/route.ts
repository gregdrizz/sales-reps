import { db } from "@/server/db/client";
import { authUser, badRequest, json, notFound } from "@/server/http";
import { scriptUpdateSchema } from "@/server/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const script = await db
    .selectFrom("scripts")
    .selectAll()
    .where("id", "=", id)
    .where("user_id", "=", auth.userId)
    .executeTakeFirst();

  if (!script) return notFound("Script not found");
  return json({ script });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = scriptUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid script", parsed.error.flatten());

  const { name, instruction, language, voiceGender } = parsed.data;
  const updated = await db
    .updateTable("scripts")
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(instruction !== undefined ? { instruction } : {}),
      ...(language !== undefined ? { language: language ?? null } : {}),
      ...(voiceGender !== undefined ? { voice_gender: voiceGender } : {}),
      updated_at: new Date(),
    })
    .where("id", "=", id)
    .where("user_id", "=", auth.userId)
    .returningAll()
    .executeTakeFirst();

  if (!updated) return notFound("Script not found");
  return json({ script: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const result = await db
    .deleteFrom("scripts")
    .where("id", "=", id)
    .where("user_id", "=", auth.userId)
    .executeTakeFirst();

  if (!result.numDeletedRows) return notFound("Script not found");
  return json({ ok: true });
}
