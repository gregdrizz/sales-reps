import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic auth gate: if there's no session cookie, bounce to /login before
// rendering protected pages. Full validation happens server-side via
// requireUser(); this just avoids flashing protected UI to logged-out users.
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/scripts/:path*",
    "/contacts/:path*",
    "/campaigns/:path*",
    "/calls/:path*",
    "/tasks/:path*",
    "/analytics/:path*",
  ],
};
