import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/app-sprint-community/roadmap",
        destination: "/app-sprint/roadmap",
        permanent: true,
      },
      {
        source: "/app-sprint-community/roadmap/:slug*",
        destination: "/app-sprint/roadmap/:slug*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
