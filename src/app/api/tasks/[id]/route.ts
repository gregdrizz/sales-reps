import { db } from "@/server/db/client";
import { authUser, badRequest, json, notFound } from "@/server/http";
import { taskUpdateSchema } from "@/server/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = taskUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid task", parsed.error.flatten());

  const { status, notes, dueAt } = parsed.data;
  const updated = await db
    .updateTable("follow_up_tasks")
    .set({
      ...(status !== undefined ? { status } : {}),
      ...(status === "done" ? { completed_at: new Date() } : {}),
      ...(status === "open" ? { completed_at: null } : {}),
      ...(notes !== undefined ? { notes: notes ?? null } : {}),
      ...(dueAt !== undefined ? { due_at: dueAt ? new Date(dueAt) : null } : {}),
    })
    .where("id", "=", id)
    .where("user_id", "=", auth.userId)
    .returningAll()
    .executeTakeFirst();

  if (!updated) return notFound("Task not found");
  return json({ task: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const result = await db
    .deleteFrom("follow_up_tasks")
    .where("id", "=", id)
    .where("user_id", "=", auth.userId)
    .executeTakeFirst();

  if (!result.numDeletedRows) return notFound("Task not found");
  return json({ ok: true });
}
