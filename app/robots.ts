import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/learn", "/drafts", "/l/"],
      },
    ],
    sitemap: "https://tap-and-swipe.com/sitemap.xml",
  };
}
