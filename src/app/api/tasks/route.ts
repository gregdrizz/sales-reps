import { db } from "@/server/db/client";
import { authUser, badRequest, json } from "@/server/http";
import { taskCreateSchema } from "@/server/validation";

export const runtime = "nodejs";

/** List tasks. ?status=open|done filters; default returns all. */
export async function GET(req: Request) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const status = new URL(req.url).searchParams.get("status");

  let q = db
    .selectFrom("follow_up_tasks")
    .leftJoin("contacts", "contacts.id", "follow_up_tasks.contact_id")
    .select([
      "follow_up_tasks.id as id",
      "follow_up_tasks.title as title",
      "follow_up_tasks.notes as notes",
      "follow_up_tasks.status as status",
      "follow_up_tasks.due_at as due_at",
      "follow_up_tasks.call_id as call_id",
      "follow_up_tasks.contact_id as contact_id",
      "follow_up_tasks.created_at as created_at",
      "follow_up_tasks.completed_at as completed_at",
      "contacts.name as contact_name",
      "contacts.phone as contact_phone",
    ])
    .where("follow_up_tasks.user_id", "=", auth.userId)
    .orderBy("follow_up_tasks.status", "asc")
    .orderBy("follow_up_tasks.created_at", "desc")
    .limit(500);

  if (status === "open" || status === "done") {
    q = q.where("follow_up_tasks.status", "=", status);
  }

  return json({ tasks: await q.execute() });
}

export async function POST(req: Request) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;

  const parsed = taskCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid task", parsed.error.flatten());

  const task = await db
    .insertInto("follow_up_tasks")
    .values({
      user_id: auth.userId,
      title: parsed.data.title,
      notes: parsed.data.notes ?? null,
      due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      contact_id: parsed.data.contactId ?? null,
      call_id: parsed.data.callId ?? null,
      status: "open",
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return json({ task }, { status: 201 });
}
