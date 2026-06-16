import { requireUser } from "@/server/auth/session";

// Auth boundary for the whole authenticated app. The full navigation shell is
// added in the UI step; this guarantees every nested page has a user.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <>{children}</>;
}
