import path from "node:path";

import type { NextConfig } from "next";

const apiInternalBaseUrl = (process.env.API_INTERNAL_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
