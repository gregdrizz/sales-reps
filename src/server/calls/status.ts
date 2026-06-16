import type { CallStatus } from "@/server/db/types";

/**
 * Normalize the many shapes Dial may report (`"In-Progress"`, `"Ringing"`,
 * `"completed"`, `"no-answer"`, …) into our stored CallStatus.
 */
export function mapDialStatus(raw: string | undefined | null): CallStatus {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("complete") || s.includes("terminated")) return "completed";
  if (s.includes("no-answer") || s.includes("no_answer") || s.includes("noanswer"))
    return "no-answer";
  if (s.includes("busy")) return "busy";
  if (s.includes("cancel")) return "canceled";
  if (s.includes("fail")) return "failed";
  if (s.includes("progress")) return "in_progress";
  if (s.includes("ring") || s.includes("queue") || s.includes("dial")) return "dialing";
  return "dialing";
}

const TERMINAL: ReadonlySet<CallStatus> = new Set([
  "completed",
  "busy",
  "no-answer",
  "failed",
  "canceled",
]);

export function isTerminal(status: CallStatus): boolean {
  return TERMINAL.has(status);
}
