import { redirect } from "next/navigation";

// The dashboard lives at /dashboard; the root just routes there. Auth is
// enforced inside the (app) layout group.
export default function Home() {
  redirect("/dashboard");
}
