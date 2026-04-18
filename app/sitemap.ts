import type { MetadataRoute } from "next";
import { getAllEpisodes } from "@/lib/episodes";

export default function sitemap(): MetadataRoute.Sitemap {
  const episodes = getAllEpisodes();

  const latestEpisodeDate = episodes.length > 0
    ? new Date(episodes[0].date)
    : new Date();

  const episodeEntries: MetadataRoute.Sitemap = episodes.map((ep) => ({
    url: `https://tap-and-swipe.com/episodes/${ep.slug}`,
    lastModified: new Date(ep.updatedDate || ep.date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: "https://tap-and-swipe.com",
      lastModified: latestEpisodeDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://tap-and-swipe.com/app-sprint-community",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://tap-and-swipe.com/episodes",
      lastModified: latestEpisodeDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://tap-and-swipe.com/about",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://tap-and-swipe.com/share",
      lastModified: new Date("2026-04-18"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://tap-and-swipe.com/divvy",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "monthly",
      priority: 0.1,
    },
    {
      url: "https://tap-and-swipe.com/netpay",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "monthly",
      priority: 0.1,
    },
    {
      url: "https://tap-and-swipe.com/versy",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "monthly",
      priority: 0.1,
    },
    {
      url: "https://tap-and-swipe.com/lua",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "monthly",
      priority: 0.1,
    },
    {
      url: "https://tap-and-swipe.com/glow",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "monthly",
      priority: 0.1,
    },
    {
      url: "https://tap-and-swipe.com/privacy",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: "https://tap-and-swipe.com/app-sprint-community/privacy",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "yearly",
      priority: 0.1,
    },
    {
      url: "https://tap-and-swipe.com/app-sprint-community/tos",
      lastModified: new Date("2026-04-15"),
      changeFrequency: "yearly",
      priority: 0.1,
    },
    ...episodeEntries,
  ];
}
