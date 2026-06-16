import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-only native deps (pg) out of the client/edge bundle.
  serverExternalPackages: ["pg", "kysely", "ioredis"],
  // Pin the workspace root (a parent lockfile exists on this machine).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
