"use client";

import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

/** Browser auth client. baseURL defaults to the current origin. */
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});

export const { signIn, signOut, useSession } = authClient;
