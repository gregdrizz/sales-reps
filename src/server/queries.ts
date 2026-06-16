import "server-only";
import { db } from "@/server/db/client";

export async function listScripts(userId: string) {
  return db
    .selectFrom("scripts")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("created_at", "desc")
    .execute();
}

export async function listContacts(userId: string) {
  return db
    .selectFrom("contacts")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("created_at", "desc")
    .execute();
}

export async function listCampaigns(userId: string) {
  return db
    .selectFrom("campaigns")
    .leftJoin("calls", "calls.campaign_id", "campaigns.id")
    .select(({ fn }) => [
      "campaigns.id as id",
      "campaigns.name as name",
      "campaigns.mode as mode",
      "campaigns.status as status",
      "campaigns.created_at as created_at",
      fn.count<string>("calls.id").as("call_count"),
      fn
        .count<string>("calls.id")
        .filterWhere("calls.needs_follow_up", "=", true)
        .as("follow_up_count"),
    ])
    .where("campaigns.user_id", "=", userId)
    .groupBy("campaigns.id")
    .orderBy("campaigns.created_at", "desc")
    .execute();
}

export async function getCampaignWithCalls(userId: string, id: string) {
  const campaign = await db
    .selectFrom("campaigns")
    .innerJoin("scripts", "scripts.id", "campaigns.script_id")
    .select([
      "campaigns.id as id",
      "campaigns.name as name",
      "campaigns.mode as mode",
      "campaigns.status as status",
      "campaigns.created_at as created_at",
      "scripts.name as script_name",
    ])
    .where("campaigns.id", "=", id)
    .where("campaigns.user_id", "=", userId)
    .executeTakeFirst();
  if (!campaign) return null;

  const calls = await db
    .selectFrom("calls")
    .leftJoin("contacts", "contacts.id", "calls.contact_id")
    .select([
      "calls.id as id",
      "calls.to_number as to_number",
      "calls.status as status",
      "calls.transcript as transcript",
      "calls.duration_seconds as duration_seconds",
      "calls.needs_follow_up as needs_follow_up",
      "calls.follow_up_reason as follow_up_reason",
      "calls.follow_up_score as follow_up_score",
      "calls.recording_available as recording_available",
      "calls.error as error",
      "calls.created_at as created_at",
      "calls.ended_at as ended_at",
      "contacts.name as contact_name",
    ])
    .where("calls.campaign_id", "=", id)
    .orderBy("calls.created_at", "asc")
    .execute();

  return { campaign, calls };
}

export type CallRow = Awaited<ReturnType<typeof getCampaignWithCalls>> extends infer T
  ? T extends { calls: infer C }
    ? C extends (infer R)[]
      ? R
      : never
    : never
  : never;

export async function listCalls(userId: string, opts: { followUp?: boolean } = {}) {
  let q = db
    .selectFrom("calls")
    .leftJoin("contacts", "contacts.id", "calls.contact_id")
    .leftJoin("campaigns", "campaigns.id", "calls.campaign_id")
    .select([
      "calls.id as id",
      "calls.to_number as to_number",
      "calls.status as status",
      "calls.transcript as transcript",
      "calls.duration_seconds as duration_seconds",
      "calls.needs_follow_up as needs_follow_up",
      "calls.follow_up_reason as follow_up_reason",
      "calls.follow_up_score as follow_up_score",
      "calls.recording_available as recording_available",
      "calls.error as error",
      "calls.created_at as created_at",
      "calls.ended_at as ended_at",
      "contacts.name as contact_name",
      "campaigns.name as campaign_name",
      "calls.campaign_id as campaign_id",
    ])
    .where("calls.user_id", "=", userId)
    .orderBy("calls.created_at", "desc")
    .limit(500);
  if (opts.followUp) q = q.where("calls.needs_follow_up", "=", true);
  return q.execute();
}

export async function listTasks(userId: string, status?: "open" | "done") {
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
      "follow_up_tasks.created_at as created_at",
      "contacts.name as contact_name",
      "contacts.phone as contact_phone",
    ])
    .where("follow_up_tasks.user_id", "=", userId)
    .orderBy("follow_up_tasks.status", "asc")
    .orderBy("follow_up_tasks.created_at", "desc")
    .limit(500);
  if (status) q = q.where("follow_up_tasks.status", "=", status);
  return q.execute();
}

export async function dashboardStats(userId: string) {
  const [scripts, contacts, campaigns, calls, followUps, openTasks] = await Promise.all([
    db.selectFrom("scripts").select(({ fn }) => fn.countAll<string>().as("n")).where("user_id", "=", userId).executeTakeFirst(),
    db.selectFrom("contacts").select(({ fn }) => fn.countAll<string>().as("n")).where("user_id", "=", userId).executeTakeFirst(),
    db.selectFrom("campaigns").select(({ fn }) => fn.countAll<string>().as("n")).where("user_id", "=", userId).executeTakeFirst(),
    db.selectFrom("calls").select(({ fn }) => fn.countAll<string>().as("n")).where("user_id", "=", userId).executeTakeFirst(),
    db.selectFrom("calls").select(({ fn }) => fn.countAll<string>().as("n")).where("user_id", "=", userId).where("needs_follow_up", "=", true).executeTakeFirst(),
    db.selectFrom("follow_up_tasks").select(({ fn }) => fn.countAll<string>().as("n")).where("user_id", "=", userId).where("status", "=", "open").executeTakeFirst(),
  ]);
  return {
    scripts: Number(scripts?.n ?? 0),
    contacts: Number(contacts?.n ?? 0),
    campaigns: Number(campaigns?.n ?? 0),
    calls: Number(calls?.n ?? 0),
    followUps: Number(followUps?.n ?? 0),
    openTasks: Number(openTasks?.n ?? 0),
  };
}
