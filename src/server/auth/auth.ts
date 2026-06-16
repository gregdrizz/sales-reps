import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { getPool } from "@/server/db/client";
import { getEnv } from "@/server/env";

const env = getEnv();

/**
 * better-auth server instance. We hand it the shared pg Pool; better-auth uses
 * Kysely internally against the singular `user`/`session`/`account`/
 * `verification` tables created in migration 001. Username/password login is
 * enabled via the username plugin.
 */
export const auth = betterAuth({
  database: getPool(),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [username()],
});

export type Session = typeof auth.$Infer.Session;
