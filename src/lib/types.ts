export interface SerializedCall {
  id: string;
  to_number: string;
  contact_name: string | null;
  status: string;
  transcript: string | null;
  duration_seconds: number | null;
  needs_follow_up: boolean | null;
  follow_up_reason: string | null;
  follow_up_score: number | null;
  summary: string | null;
  sentiment: string | null;
  next_action: string | null;
  recording_available: boolean;
  error: string | null;
  created_at: string;
  ended_at: string | null;
  campaign_name?: string | null;
  campaign_id?: string | null;
}

const TERMINAL = ["completed", "busy", "no-answer", "failed", "canceled"];
export function isTerminalStatus(status: string): boolean {
  return TERMINAL.includes(status);
}
