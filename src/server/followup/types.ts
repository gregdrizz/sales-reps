import type { CallStatus } from "@/server/db/types";

export interface FollowUpInput {
  transcript: string | null;
  status: CallStatus;
}

export interface FollowUpResult {
  /** Whether a human follow-up is warranted. */
  needsFollowUp: boolean;
  /** Short human-readable explanation. */
  reason: string;
  /** Confidence/intensity in [0, 1]. */
  score: number;
  /** One-line call summary (LLM analyzers only). */
  summary?: string | null;
  /** "positive" | "neutral" | "negative" (LLM analyzers only). */
  sentiment?: string | null;
  /** Suggested next action (LLM analyzers only). */
  nextAction?: string | null;
}

export interface FollowUpAnalyzer {
  readonly name: string;
  analyze(input: FollowUpInput): Promise<FollowUpResult>;
}
