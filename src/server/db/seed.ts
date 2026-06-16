import { auth } from "@/server/auth/auth";
import { getEnv } from "@/server/env";
import { db } from "./client";

// Creates the initial admin user via better-auth so the password hash matches
// the auth library's expectations. Idempotent: skips if the username exists.
async function seed() {
  const env = getEnv();
  const username = env.SEED_ADMIN_USERNAME;

  const existing = await db
    .selectFrom("user")
    .select("id")
    .where("username", "=", username)
    .executeTakeFirst();

  if (existing) {
    console.log(`User "${username}" already exists — nothing to seed.`);
    await db.destroy();
    return;
  }

  await auth.api.signUpEmail({
    body: {
      email: `${username}@sales-reps.local`,
      password: env.SEED_ADMIN_PASSWORD,
      name: username,
      username,
    } as { email: string; password: string; name: string; username: string },
  });

  console.log(`Created admin user "${username}".`);
  await db.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
