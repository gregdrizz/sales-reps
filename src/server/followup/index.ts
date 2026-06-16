import { getEnv } from "@/server/env";
import { ClaudeAnalyzer } from "./claude";
import { GroqAnalyzer } from "./groq";
import { HeuristicAnalyzer } from "./heuristic";
import type { FollowUpAnalyzer } from "./types";

export type { FollowUpAnalyzer, FollowUpInput, FollowUpResult } from "./types";

let cached: FollowUpAnalyzer | null = null;

/**
 * Returns the configured analyzer. An AI analyzer (Groq by default, or Claude)
 * is used only when selected AND its API key is present; otherwise we fall back
 * to the zero-dependency heuristic so the platform always works out of the box.
 */
export function getFollowUpAnalyzer(): FollowUpAnalyzer {
  if (cached) return cached;
  const env = getEnv();
  if (env.FOLLOWUP_ANALYZER === "groq" && env.GROQ_API_KEY) {
    cached = new GroqAnalyzer(env.GROQ_API_KEY, env.GROQ_MODEL);
  } else if (env.FOLLOWUP_ANALYZER === "claude" && env.ANTHROPIC_API_KEY) {
    cached = new ClaudeAnalyzer(env.ANTHROPIC_API_KEY, env.CLAUDE_MODEL);
  } else {
    cached = new HeuristicAnalyzer();
  }
  return cached;
}
