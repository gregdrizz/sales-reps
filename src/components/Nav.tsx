"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scripts", label: "Scripts" },
  { href: "/contacts", label: "Contacts" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/calls", label: "Calls" },
  { href: "/tasks", label: "Follow-ups" },
];

export function Nav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-6 px-2">
        <div className="text-lg font-semibold">Sales Reps</div>
        <div className="text-xs text-[var(--muted)]">AI calling platform</div>
      </div>
      <nav className="flex flex-col gap-1">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[var(--border)] pt-4">
        <div className="px-2 text-sm">{username}</div>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
