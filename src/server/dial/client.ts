import { getEnv } from "@/server/env";

export type DialVoiceGender = "female" | "male";

export interface PlaceCallInput {
  to: string;
  outboundInstruction: string;
  language?: string | null;
  voiceGender?: DialVoiceGender;
  /** Reused on retries so an ambiguous failure never double-dials. */
  idempotencyKey?: string;
}

export interface DialCall {
  id: string;
  from?: string;
  to: string;
  direction?: string;
  status: string;
  duration?: number | null;
  transcript?: string | null;
  recordingAvailable?: boolean;
  createdAt?: string;
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "busy",
  "no-answer",
  "failed",
  "canceled",
  "cancelled",
]);

export function isTerminalDialStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.has(status.toLowerCase());
}

/** Thrown for non-2xx responses from the Dial API. */
export class DialApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "DialApiError";
  }
}

/**
 * Thin client over the Dial REST API (https://docs.getdial.ai). Responses may
 * be the bare resource or wrapped as `{ call: ... }` / `{ message: ... }`; we
 * normalize both.
 */
export class DialClient {
  private readonly base: string;
  private readonly apiKey: string;
  private readonly fromNumberId: string;

  constructor(opts?: { base?: string; apiKey?: string; fromNumberId?: string }) {
    const env = getEnv();
    this.base = (opts?.base ?? env.DIAL_API_BASE).replace(/\/$/, "");
    this.apiKey = opts?.apiKey ?? env.DIAL_API_KEY;
    this.fromNumberId = opts?.fromNumberId ?? env.DIAL_FROM_NUMBER_ID;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<T> {
    const { idempotencyKey, ...rest } = init;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...(rest.headers as Record<string, string> | undefined),
    };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    const res = await fetch(`${this.base}${path}`, { ...rest, headers });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!res.ok) {
      const msg =
        (body && typeof body === "object" && "message" in body
          ? String((body as { message: unknown }).message)
          : null) ?? `Dial API error ${res.status}`;
      throw new DialApiError(res.status, msg);
    }

    return body as T;
  }

  private static unwrapCall(body: unknown): DialCall {
    if (body && typeof body === "object" && "call" in body) {
      return (body as { call: DialCall }).call;
    }
    return body as DialCall;
  }

  /** POST /api/v1/calls — place an outbound AI voice call. */
  async placeCall(input: PlaceCallInput): Promise<DialCall> {
    const payload: Record<string, unknown> = {
      to: input.to,
      fromNumberId: this.fromNumberId || undefined,
      outboundInstruction: input.outboundInstruction,
    };
    if (input.language) payload.language = input.language;
    if (input.voiceGender) payload.voiceGender = input.voiceGender;

    const body = await this.request<unknown>("/api/v1/calls", {
      method: "POST",
      body: JSON.stringify(payload),
      idempotencyKey: input.idempotencyKey,
    });
    return DialClient.unwrapCall(body);
  }

  /** GET /api/v1/calls/:id — fetch a call (transcript available once ended). */
  async getCall(id: string): Promise<DialCall> {
    const body = await this.request<unknown>(`/api/v1/calls/${id}`, {
      method: "GET",
    });
    return DialClient.unwrapCall(body);
  }

  /** POST /api/v1/messages — send an SMS. */
  async sendMessage(input: { to: string; body: string }): Promise<unknown> {
    return this.request<unknown>("/api/v1/messages", {
      method: "POST",
      body: JSON.stringify({
        to: input.to,
        body: input.body,
        fromNumberId: this.fromNumberId || undefined,
      }),
    });
  }
}

let cached: DialClient | null = null;
export function getDialClient(): DialClient {
  if (!cached) cached = new DialClient();
  return cached;
}
