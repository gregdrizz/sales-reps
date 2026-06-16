import type { FollowUpAnalyzer, FollowUpInput, FollowUpResult } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Groq-backed analyzer (OpenAI-compatible chat completions). Cheap + fast.
 * Forces a JSON object response and parses the follow-up verdict from it.
 */
export class GroqAnalyzer implements FollowUpAnalyzer {
  readonly name = "groq";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async analyze(input: FollowUpInput): Promise<FollowUpResult> {
    const system =
      "You are a sales-operations assistant analyzing an outbound sales call. " +
      "Reply ONLY with a JSON object: " +
      '{"needsFollowUp": boolean, "reason": string, "score": number, ' +
      '"summary": string, "sentiment": "positive"|"neutral"|"negative", ' +
      '"nextAction": string}. ' +
      "score is 0..1 (how strongly a follow-up is warranted). A clear rejection " +
      "=> needsFollowUp false, score 0. summary is one concise sentence. " +
      "nextAction is a short suggested next step for the rep. " +
      "Transcripts may be in English or Hebrew.";

    const user = [
      `Call status: ${input.status}`,
      "Transcript:",
      input.transcript?.trim() || "(no transcript captured)",
    ].join("\n");

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        max_tokens: 256,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    const parsed = safeJson(content);
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
      summary: optStr(parsed.summary),
      sentiment: optStr(parsed.sentiment),
      nextAction: optStr(parsed.nextAction),
    };
  }
}

function optStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, 800) : null;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}
