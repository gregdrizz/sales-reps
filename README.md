# Sales Reps

AI-powered outbound calling platform for sales representatives. Manage call
**scripts**, keep a list of **contacts**, launch **campaigns** that dial numbers
one-by-one or all-at-once via the [Dial](https://getdial.ai) voice API, capture
each call's **transcript**, and automatically flag which calls **need a
follow-up**.

Built with Next.js 15 (App Router) + TypeScript, Kysely + PostgreSQL, Redis,
and better-auth. See [`architecture.md`](./architecture.md) for the design and
decision log.

## Prerequisites

- Node.js 20.12+ (24 recommended)
- Docker (for Postgres + Redis)
- A [Dial](https://getdial.ai) API key and a provisioned number

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure env
cp .env.example .env
#   then edit .env — at minimum set DIAL_API_KEY, DIAL_FROM_NUMBER_ID,
#   and BETTER_AUTH_SECRET (openssl rand -base64 32)

# 3. Start Postgres + Redis
npm run infra:up

# 4. Run migrations and seed the first user
npm run db:migrate
npm run db:seed        # creates SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD

# 5. Start the app and the background worker (two terminals)
npm run dev
npm run worker
```

Open http://localhost:3000 and sign in with the seeded admin credentials.

## How it works

1. **Scripts** — write the instruction (system prompt) your AI agent follows on
   a call. Choose a language and voice.
2. **Contacts** — add numbers (E.164) individually or paste a list to bulk
   import.
3. **Campaigns** — pick a script + contacts and a mode:
   - **One by one** (sequential): each call completes before the next starts.
   - **All at once** (parallel): calls fan out (capped at 5 concurrent).
4. The **worker** places each call through Dial, polls it to completion, stores
   the transcript, and runs the **follow-up analyzer**.
5. **Calls** view shows transcripts and follow-up flags; filter to just the ones
   that need a follow-up. Place a **Quick call** (ad-hoc number + script or inline
   instruction), **Call again**, or **Text** any number right from the list.

### More capabilities

- **Auto-redial & scheduling** (campaign → "Show scheduling & retries"): retry
  busy/no-answer/failed up to N attempts with a delay, start at a future time,
  and restrict dialing to working hours.
- **SMS & follow-up queue**: send texts, auto-text contacts flagged for
  follow-up (`{{name}}` template), and work a **Follow-ups** task list that
  auto-fills from flagged calls.
- **AI insights & analytics**: with an LLM analyzer enabled, each call gets a
  summary, sentiment, and suggested next action; the **Analytics** page shows
  answer rate, avg duration, follow-up rate, calls/day, and per-script
  performance.

### Follow-up analyzer

Pluggable via `FOLLOWUP_ANALYZER`:

- `heuristic` (default) — zero-dependency keyword scoring (English + Hebrew).
- `groq` — cheap/fast LLM via Groq (set `GROQ_API_KEY`).
- `claude` — Anthropic (set `ANTHROPIC_API_KEY`).

An AI analyzer is used only when selected *and* its API key is present;
otherwise it falls back to the heuristic.

### Real-time updates (optional)

The worker keeps call rows current by polling. To also get push updates,
register `POST /api/webhooks/dial` as a Dial webhook (optionally set
`DIAL_WEBHOOK_SECRET`). The UI also has a **Sync now** button that reconciles
in-flight calls on demand.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js (host) |
| `npm run worker` | Start the background call worker |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply migrations |
| `npm run db:rollback` | Roll back the last migration |
| `npm run db:seed` | Create the initial admin user |
| `npm run infra:up` / `infra:down` | Start/stop Postgres + Redis |

## Project layout

```
src/
  app/
    (app)/              authenticated pages (dashboard, scripts, contacts, campaigns, calls)
    api/                route handlers (auth, scripts, contacts, campaigns, calls, webhook)
    login/              sign-in page
  components/           shared UI (Nav, StatusBadge, CallCard)
  lib/                  client helpers (auth-client, format, types)
  server/
    auth/               better-auth server + session helpers
    calls/              queue, processor, orchestrator, reconcile, status mapping
    db/                 Kysely client, types, migrations, seed
    dial/               Dial API client
    followup/           pluggable follow-up analyzer (heuristic/groq/claude)
    worker/             background job worker
```
