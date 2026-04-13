import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/app-sprint/roadmap/:slug*",
        destination: "/app-sprint-community/roadmap/:slug*",
        permanent: true,
      },
      {
        source: "/app-sprint/roadmap",
        destination: "/app-sprint-community/roadmap",
        permanent: true,
      },
      {
        source: "/app-sprint",
        destination: "/app-sprint-community",
        permanent: true,
      },
      {
        source: "/aso",
        destination: "https://appsprint.app/aso",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
