import { requireUser } from "@/server/auth/session";
import { listScripts } from "@/server/queries";
import { ScriptsManager } from "./ScriptsManager";

export const dynamic = "force-dynamic";

export default async function ScriptsPage() {
  const user = await requireUser();
  const scripts = await listScripts(user.id);
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Scripts</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        A script (transcript) is the instruction your AI agent follows on each call.
      </p>
      <ScriptsManager
        initialScripts={scripts.map((s) => ({
          id: s.id,
          name: s.name,
          instruction: s.instruction,
          language: s.language,
          voice_gender: s.voice_gender,
        }))}
      />
    </main>
  );
}
