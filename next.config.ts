import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
    ],
  },
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
          ...(isProd
            ? [
                {
                  key: "Content-Security-Policy",
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.googletagmanager.com",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: blob: https://yt3.googleusercontent.com https://*.mzstatic.com https://*.google-analytics.com https://*.googletagmanager.com",
                    "media-src 'self' https://assets.whop.com",
                    "font-src 'self'",
                    "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
                    "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
                    "object-src 'none'",
                    "base-uri 'self'",
                    "form-action 'self'",
                    "frame-ancestors 'none'",
                    "upgrade-insecure-requests",
                  ].join("; "),
                },
              ]
            : []),
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
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
