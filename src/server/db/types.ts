import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

/** Timestamp read as `Date`, written as `Date | string`. */
type Timestamp = ColumnType<Date, Date | string, Date | string>;
/** Timestamp with a DB default: optional on insert, settable on update. */
type DefaultTimestamp = ColumnType<Date, Date | string | undefined, Date | string>;
/** Nullable timestamp (no default). */
type NullableTimestamp = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null
>;

export type CallStatus =
  | "queued"
  | "dialing"
  | "in_progress"
  | "completed"
  | "busy"
  | "no-answer"
  | "failed"
  | "canceled";

export type CampaignMode = "sequential" | "parallel";
export type CampaignStatus = "pending" | "running" | "completed" | "failed";
export type VoiceGender = "female" | "male";
export type MessageDirection = "outbound" | "inbound";
export type TaskStatus = "open" | "done";

// ─── better-auth owned tables (camelCase columns, quoted by Kysely) ──────────

export interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string | null;
  displayUsername: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Application tables (snake_case) ─────────────────────────────────────────

export interface ScriptTable {
  id: Generated<string>;
  user_id: string;
  name: string;
  instruction: string;
  language: string | null;
  voice_gender: ColumnType<VoiceGender, VoiceGender | undefined, VoiceGender>;
  created_at: DefaultTimestamp;
  updated_at: DefaultTimestamp;
}

export interface ContactTable {
  id: Generated<string>;
  user_id: string;
  name: string;
  phone: string;
  notes: string | null;
  created_at: DefaultTimestamp;
}

export interface CampaignTable {
  id: Generated<string>;
  user_id: string;
  script_id: string;
  name: string;
  mode: CampaignMode;
  status: ColumnType<CampaignStatus, CampaignStatus | undefined, CampaignStatus>;
  scheduled_at: NullableTimestamp;
  max_attempts: ColumnType<number, number | undefined, number>;
  retry_delay_seconds: ColumnType<number, number | undefined, number>;
  work_start_hour: number | null;
  work_end_hour: number | null;
  sms_on_followup: ColumnType<boolean, boolean | undefined, boolean>;
  sms_template: string | null;
  created_at: DefaultTimestamp;
}

export interface CallTable {
  id: Generated<string>;
  user_id: string;
  campaign_id: string | null;
  contact_id: string | null;
  dial_call_id: string | null;
  to_number: string;
  status: ColumnType<CallStatus, CallStatus | undefined, CallStatus>;
  transcript: string | null;
  duration_seconds: number | null;
  needs_follow_up: boolean | null;
  follow_up_reason: string | null;
  follow_up_score: number | null;
  summary: string | null;
  sentiment: string | null;
  next_action: string | null;
  recording_available: ColumnType<boolean, boolean | undefined, boolean>;
  error: string | null;
  instruction_override: string | null;
  language: string | null;
  voice_gender: VoiceGender | null;
  attempt: ColumnType<number, number | undefined, number>;
  max_attempts: ColumnType<number, number | undefined, number>;
  retry_delay_seconds: ColumnType<number, number | undefined, number>;
  parent_call_id: string | null;
  created_at: DefaultTimestamp;
  updated_at: DefaultTimestamp;
  ended_at: NullableTimestamp;
}

export interface MessageTable {
  id: Generated<string>;
  user_id: string;
  contact_id: string | null;
  call_id: string | null;
  to_number: string;
  body: string;
  direction: ColumnType<MessageDirection, MessageDirection | undefined, MessageDirection>;
  dial_message_id: string | null;
  status: ColumnType<string, string | undefined, string>;
  error: string | null;
  created_at: DefaultTimestamp;
}

export interface FollowUpTaskTable {
  id: Generated<string>;
  user_id: string;
  call_id: string | null;
  contact_id: string | null;
  title: string;
  notes: string | null;
  status: ColumnType<TaskStatus, TaskStatus | undefined, TaskStatus>;
  due_at: NullableTimestamp;
  created_at: DefaultTimestamp;
  completed_at: NullableTimestamp;
}

export interface Database {
  user: UserTable;
  scripts: ScriptTable;
  contacts: ContactTable;
  campaigns: CampaignTable;
  calls: CallTable;
  messages: MessageTable;
  follow_up_tasks: FollowUpTaskTable;
}

export type Message = Selectable<MessageTable>;
export type FollowUpTask = Selectable<FollowUpTaskTable>;

// Convenience row types
export type Script = Selectable<ScriptTable>;
export type NewScript = Insertable<ScriptTable>;
export type ScriptUpdate = Updateable<ScriptTable>;

export type Contact = Selectable<ContactTable>;
export type NewContact = Insertable<ContactTable>;

export type Campaign = Selectable<CampaignTable>;
export type NewCampaign = Insertable<CampaignTable>;

export type Call = Selectable<CallTable>;
export type NewCall = Insertable<CallTable>;
export type CallUpdate = Updateable<CallTable>;
