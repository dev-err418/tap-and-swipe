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
    priority: 0.7,
  }));

  return [
    {
      url: "https://tap-and-swipe.com",
      lastModified: latestEpisodeDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://tap-and-swipe.com/episodes",
      lastModified: latestEpisodeDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://tap-and-swipe.com/app-sprint",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://tap-and-swipe.com/app-sprint-community",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://tap-and-swipe.com/aso",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://tap-and-swipe.com/versy",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://tap-and-swipe.com/lua",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://tap-and-swipe.com/glow",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://tap-and-swipe.com/privacy",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://tap-and-swipe.com/tos",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...episodeEntries,
  ];
}
