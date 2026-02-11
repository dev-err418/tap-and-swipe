import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**": ["./lib/generated/prisma/**/*"],
  },
};

export default nextConfig;
