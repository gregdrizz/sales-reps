import { redialCall } from "@/server/calls/orchestrator";
import { authUser, badRequest, json, serverError } from "@/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Re-run a past call with the same number + instruction. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await authUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  try {
    const call = await redialCall(auth.userId, id);
    return json({ call }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to redial";
    if (message === "Call not found") return badRequest(message);
    console.error("[calls] redial failed:", err);
    return serverError();
  }
}
