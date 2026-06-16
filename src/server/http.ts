import { getUserId } from "@/server/auth/session";

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function badRequest(message: string, details?: unknown): Response {
  return Response.json({ error: message, details }, { status: 400 });
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFound(message = "Not found"): Response {
  return Response.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal error"): Response {
  return Response.json({ error: message }, { status: 500 });
}

/** Returns the user id, or a 401 Response to return early. */
export async function authUser(): Promise<
  { userId: string } | { response: Response }
> {
  const userId = await getUserId();
  if (!userId) return { response: unauthorized() };
  return { userId };
}
