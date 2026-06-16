# Architecture — Sales Reps Platform

A platform for sales representatives to run AI-powered outbound calling campaigns:
manage call **scripts** (a.k.a. transcripts), keep a list of **contacts**, launch
**campaigns** that dial numbers one-by-one or all-at-once via the
[Dial](https://getdial.ai) voice API, record each call's transcript, and
automatically flag which calls **need a follow-up**.

This document is the living record of architecture decisions. It is updated on
every meaningful change.

---

## Tech stack

| Concern            | Choice                                  | Why |
| ------------------ | --------------------------------------- | --- |
| Framework          | Next.js 15 (App Router) + TypeScript    | Server Components + Route Handlers in one deployable unit. |
| DB access          | Kysely + `pg` (PostgreSQL 16)           | Type-safe SQL query builder, no heavy ORM, explicit migrations. |
| Cache / queue      | Redis 7 (`ioredis`)                     | Caching + a lightweight outbound-call job queue. |
| Auth               | better-auth (username/password)         | First-class Kysely support, username plugin, session cookies. |
| Voice calls        | Dial REST API                           | `POST /api/v1/calls`, transcripts via `GET /api/v1/calls/:id`. |
| Styling            | Tailwind CSS v4                         | Utility-first, dark UI, zero runtime. |
| Validation         | zod                                     | Runtime validation of env + API payloads. |

Infrastructure (Postgres + Redis) runs in **docker-compose**; the Next.js app
itself runs on the host (`npm run dev`). This keeps the stateful services always
available without containerizing the dev loop.

---

## High-level shape

```
┌─────────────────────────────────────────────────────────────┐
│ Next.js (host)                                                │
│                                                               │
│  App Router pages (RSC)      Route Handlers (/api/*)          │
│   - /login                    - /api/auth/*  (better-auth)    │
│   - /  dashboard              - /api/scripts                  │
│   - /scripts                  - /api/contacts                 │
│   - /contacts                 - /api/campaigns (+ dispatch)   │
│   - /campaigns/[id]           - /api/calls (+ sync)           │
│   - /calls                    - /api/webhooks/dial            │
│                                                               │
│        │ Kysely                 │ ioredis                     │
└────────┼────────────────────────┼────────────────────────────┘
         ▼                         ▼
   ┌──────────┐             ┌──────────┐         ┌────────────┐
   │ Postgres │             │  Redis   │ ──────▶ │  Worker    │
   └──────────┘             │  queue   │  jobs   │ (tsx proc) │
                            └──────────┘         └─────┬──────┘
                                                       │ HTTPS
                                                       ▼
                                                 ┌──────────┐
                                                 │ Dial API │
                                                 └──────────┘
```

A standalone **worker** process (`npm run worker`) drains the Redis call queue,
places calls through the Dial API, polls each call to completion, stores the
transcript, and runs the follow-up analyzer. Decoupling dispatch from the
request/response cycle keeps the UI responsive and lets large campaigns run in
the background.

---

## Data model (Postgres)

better-auth owns: `user`, `session`, `account`, `verification` (+ `username`,
`displayUsername` columns on `user` from the username plugin).

Application tables:

- **scripts** — reusable call instructions ("transcripts"). The
  `instruction` is the system prompt handed to the Dial voice agent.
  `(id, user_id, name, instruction, language, voice_gender, created_at, updated_at)`
- **contacts** — people to call. `(id, user_id, name, phone, notes, created_at)`
- **campaigns** — a batch run of a script against many contacts.
  `(id, user_id, script_id, name, mode['sequential'|'parallel'], status, created_at)`
- **calls** — one row per dialed contact.
  `(id, user_id, campaign_id, contact_id, dial_call_id, to_number, status,
    transcript, duration_seconds, needs_follow_up, follow_up_reason,
    follow_up_score, recording_available, error, created_at, updated_at, ended_at)`

All application rows are scoped by `user_id` (the signed-in rep).

---

## Decision log

- **2026-06-17 — Quick/manual calls + redial.** Calls can exist without a
  campaign: the instruction is snapshotted onto the call row
  (`instruction_override`), so a one-off "quick call" and "call again" reuse the
  same processor pipeline. `parent_call_id` records redial lineage.
- **2026-06-17 — Auto-redial + scheduling.** Retry config lives on the campaign
  and is copied onto each call (`attempt`/`max_attempts`/`retry_delay_seconds`),
  so retries are self-contained. A Redis ZSET (`salesreps:delayed`) holds delayed
  jobs; a 10s scheduler tick in the worker promotes due jobs and starts due
  scheduled campaigns (claimed by nulling `scheduled_at`). Working-hours windows
  defer a campaign job to the next window.
- **2026-06-17 — SMS + follow-up tasks.** `sendSms` records every message;
  `handleFollowUp` (shared by processor + reconcile) creates one follow-up task
  per flagged call (unique index on `call_id`) and optionally auto-texts a
  `{{name}}` template when the campaign opts in.
- **2026-06-17 — AI insights + analytics.** LLM analyzers (Groq/Claude) also
  return `summary`/`sentiment`/`nextAction`, stored on the call; the heuristic
  leaves them null. An `analytics()` aggregate powers the Analytics page
  (answer rate, avg duration, follow-up rate, calls/day, per-script).


- **2026-06-16 — Project bootstrapped.** Next.js 15 App Router + TS, Tailwind v4,
  Kysely/pg, ioredis, better-auth. Postgres + Redis pinned in docker-compose;
  the app runs on the host.
- **2026-06-16 — Calls run on a Redis-backed queue drained by a separate
  worker** rather than inline in request handlers, so campaigns survive request
  timeouts and can fan out.
- **2026-06-16 — Follow-up detection is a pluggable analyzer.** Default is a
  transcript heuristic (no external dependency, English + Hebrew keyword
  signals). Optional LLM analyzers can be enabled via env: **Groq**
  (OpenAI-compatible, cheap + fast — the recommended AI option) or Claude. An AI
  analyzer activates only when both selected and its API key is present;
  otherwise the heuristic runs, so the platform always works out of the box.
- **2026-06-16 — Dial status normalization.** The Dial REST API returns a call's
  `status` as an object (`{ state, terminationType, label }`) whereas events use
  a plain string. `DialClient` normalizes it to a string
  (`terminationType || state || label`) so the status mapper has one shape to
  handle. Found and fixed during end-to-end verification.
- **2026-06-16 — Verified end-to-end.** Logged in, created a script + contact,
  launched a sequential campaign; the worker placed a real call via Dial, polled
  it to `completed`, stored the transcript, and ran the heuristic follow-up
  analyzer. UI live-polls campaign/calls while any call is active.
- **2026-06-16 — Dial integration.** A `DialClient` wraps `POST /api/v1/calls`,
  `GET /api/v1/calls/:id`, and `POST /api/v1/messages`. Calls are placed with the
  call row id as the `Idempotency-Key` so a retried job never double-dials. The
  processor places a call, polls to a terminal status (≤12 min), re-polls a few
  times for the transcript (which can finalize just after the call ends), then
  runs the analyzer. Campaign `mode` controls fan-out: `sequential` awaits each
  call in order; `parallel` runs a capped pool (5 concurrent).
