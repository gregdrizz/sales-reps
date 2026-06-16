import type { FollowUpAnalyzer, FollowUpInput, FollowUpResult } from "./types";

/**
 * Optional LLM-backed analyzer. Uses the Anthropic Messages API directly (no
 * SDK dependency) and asks the model for a strict JSON verdict. Falls back to a
 * neutral result if the response can't be parsed.
 */
export class ClaudeAnalyzer implements FollowUpAnalyzer {
  readonly name = "claude";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async analyze(input: FollowUpInput): Promise<FollowUpResult> {
    const prompt = [
      "You are a sales-operations assistant. Given the outcome and transcript of",
      "an outbound sales call, decide whether a human sales rep should follow up.",
      "",
      `Call status: ${input.status}`,
      "Transcript:",
      input.transcript?.trim() || "(no transcript captured)",
      "",
      'Respond with ONLY a JSON object: {"needsFollowUp": boolean, "reason": string, "score": number between 0 and 1}.',
      "score = how strongly a follow-up is warranted. A clear rejection => needsFollowUp false, score 0.",
    ].join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text =
      data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    const parsed = extractJson(text);
    if (!parsed) {
      return {
        needsFollowUp: false,
        reason: "Analyzer returned an unparseable response.",
        score: 0,
      };
    }

    return {
      needsFollowUp: Boolean(parsed.needsFollowUp),
      reason: String(parsed.reason ?? "").slice(0, 500),
      score: clamp01(Number(parsed.score ?? 0)),
    };
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function extractJson(
  text: string,
): { needsFollowUp?: unknown; reason?: unknown; score?: unknown } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
