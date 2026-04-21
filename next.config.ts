import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path(guests|community-icons|screenshots)/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
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
                    "script-src 'self' 'unsafe-inline' https://eu.i.posthog.com https://eu-assets.i.posthog.com https://challenges.cloudflare.com",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: blob: https://yt3.googleusercontent.com https://lh3.googleusercontent.com https://img.youtube.com",
                    "media-src 'self' https://assets.whop.com https://*.r2.dev https://videos.tap-and-swipe.com",
                    "font-src 'self'",
                    "connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com https://challenges.cloudflare.com",
                    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com",
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
        source: "/app-sprint-community/roadmap/:slug*",
        destination: "/learn/classroom/:slug*",
        permanent: true,
      },
      {
        source: "/app-sprint-community/roadmap",
        destination: "/learn/classroom",
        permanent: true,
      },
      {
        source: "/app-sprint/roadmap/:slug*",
        destination: "/learn/classroom/:slug*",
        permanent: true,
      },
      {
        source: "/app-sprint/roadmap",
        destination: "/learn/classroom",
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
      {
        source: "/stories",
        destination: "/episodes",
        permanent: true,
      },
      {
        source: "/stories/:slug",
        destination: "/episodes/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
