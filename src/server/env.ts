import { z } from "zod";

// Next.js loads `.env*` automatically for the app runtime. Standalone scripts
// (migrations, seed, worker) run under `tsx` and need an explicit load. Node
// 20.12+/24 ships `process.loadEnvFile`, so we avoid a dotenv dependency.
if (!process.env.__ENV_LOADED) {
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.(".env");
  } catch {
    // No .env file present (e.g. CI with real env vars) — ignore.
  }
  process.env.__ENV_LOADED = "1";
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  SEED_ADMIN_USERNAME: z.string().min(1).default("admin"),
  SEED_ADMIN_PASSWORD: z.string().min(1).default("changeme123"),

  DIAL_API_BASE: z.string().url().default("https://getdial.ai"),
  DIAL_API_KEY: z.string().min(1),
  DIAL_FROM_NUMBER_ID: z.string().optional().default(""),
  DIAL_WEBHOOK_SECRET: z.string().optional().default(""),

  FOLLOWUP_ANALYZER: z.enum(["heuristic", "groq", "claude"]).default("heuristic"),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  CLAUDE_MODEL: z.string().default("claude-haiku-4-5"),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
