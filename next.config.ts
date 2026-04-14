import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/llms.txt",
        destination: "/llms.txt",
      },
    ];
  },
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
