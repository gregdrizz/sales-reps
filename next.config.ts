import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-only native deps (pg) out of the client/edge bundle.
  serverExternalPackages: ["pg", "kysely", "ioredis"],
};

export default nextConfig;
