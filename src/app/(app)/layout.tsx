import { Nav } from "@/components/Nav";
import { requireUser } from "@/server/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const username = (user as { username?: string | null }).username ?? user.name;
  return (
    <div className="flex min-h-screen">
      <Nav username={username} />
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
