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
}

export interface FollowUpAnalyzer {
  readonly name: string;
  analyze(input: FollowUpInput): Promise<FollowUpResult>;
}
