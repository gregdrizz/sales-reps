import { db } from "@/server/db/client";
import { authUser, badRequest, json } from "@/server/http";
import { scriptCreateSchema } from "@/server/validation";

export const runtime = "nodejs";

export async function GET() {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const scripts = await db
    .selectFrom("scripts")
    .selectAll()
    .where("user_id", "=", auth.userId)
    .orderBy("created_at", "desc")
    .execute();

  return json({ scripts });
}

export async function POST(req: Request) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const parsed = scriptCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid script", parsed.error.flatten());

  const script = await db
    .insertInto("scripts")
    .values({
      user_id: auth.userId,
      name: parsed.data.name,
      instruction: parsed.data.instruction,
      language: parsed.data.language ?? null,
      voice_gender: parsed.data.voiceGender,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return json({ script }, { status: 201 });
}
