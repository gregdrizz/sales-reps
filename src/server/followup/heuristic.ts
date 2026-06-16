import type { FollowUpAnalyzer, FollowUpInput, FollowUpResult } from "./types";

// Multilingual (English + Hebrew) keyword signals. Weights are intentionally
// simple and tunable; positive weights push toward a follow-up, negative
// weights (explicit rejection) pull away from one.
const POSITIVE_SIGNALS: { label: string; weight: number; patterns: RegExp[] }[] = [
  {
    label: "callback requested",
    weight: 0.5,
    patterns: [
      /call me( back)?/i,
      /call back/i,
      /\blater\b/i,
      /tomorrow/i,
      /next week/i,
      /\bbusy\b/i,
      /תתקשר/,
      /תחזור אלי/,
      /אחר כך/,
      /מחר/,
      /עסוק/,
    ],
  },
  {
    label: "expressed interest",
    weight: 0.5,
    patterns: [
      /interested/i,
      /sounds good/i,
      /tell me more/i,
      /more info/i,
      /send (me|over)/i,
      /\bprice\b/i,
      /\bquote\b/i,
      /email me/i,
      /מעוניין/,
      /תשלח/,
      /מחיר/,
      /פרטים/,
      /נשמע טוב/,
    ],
  },
  {
    label: "asked a question",
    weight: 0.2,
    patterns: [/\bhow much\b/i, /\bwhat about\b/i, /can you/i, /כמה עולה/, /מה לגבי/],
  },
];

const NEGATIVE_SIGNALS: { label: string; patterns: RegExp[] }[] = [
  {
    label: "explicit rejection",
    patterns: [
      /not interested/i,
      /don'?t call/i,
      /stop calling/i,
      /remove me/i,
      /lose my number/i,
      /\bfuck off\b/i,
      /לא מעוניין/,
      /אל תתקשר/,
      /תפסיק/,
      /אל תתקשרו/,
    ],
  },
];

/**
 * Zero-dependency transcript analyzer. Couldn't-connect outcomes (busy /
 * no-answer / failed) always warrant a retry; otherwise we score keyword
 * signals in the transcript.
 */
export class HeuristicAnalyzer implements FollowUpAnalyzer {
  readonly name = "heuristic";

  async analyze(input: FollowUpInput): Promise<FollowUpResult> {
    const { status, transcript } = input;

    // Unreachable → follow up (try again) regardless of transcript.
    if (status === "busy" || status === "no-answer" || status === "failed") {
      return {
        needsFollowUp: true,
        reason: `Could not connect (${status}); retry later.`,
        score: 0.7,
      };
    }
    if (status === "canceled") {
      return { needsFollowUp: false, reason: "Call was canceled.", score: 0 };
    }

    const text = (transcript ?? "").trim();
    if (!text) {
      return {
        needsFollowUp: true,
        reason: "Connected but no conversation was captured; follow up to confirm.",
        score: 0.55,
      };
    }

    // Explicit rejection short-circuits to "no follow-up".
    for (const neg of NEGATIVE_SIGNALS) {
      if (neg.patterns.some((p) => p.test(text))) {
        return {
          needsFollowUp: false,
          reason: `Contact declined (${neg.label}).`,
          score: 0,
        };
      }
    }

    const matched: string[] = [];
    let score = 0;
    for (const sig of POSITIVE_SIGNALS) {
      if (sig.patterns.some((p) => p.test(text))) {
        score += sig.weight;
        matched.push(sig.label);
      }
    }
    score = Math.min(1, score);

    const needsFollowUp = score >= 0.5;
    const reason = matched.length
      ? `Signals: ${matched.join(", ")}.`
      : "No strong follow-up signals detected.";

    return { needsFollowUp, reason, score };
  }
}
