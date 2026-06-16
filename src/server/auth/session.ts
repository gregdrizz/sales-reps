import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Returns the current session (or null) for use in RSC / route handlers. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Returns the signed-in user or redirects to /login. For protected pages. */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Returns the signed-in user id or null. For route handlers that return 401. */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}
