import type { MetadataRoute } from "next";
import { getAllCaseStudies } from "@/lib/case-studies";
import { getAllStories } from "@/lib/stories";

export default function sitemap(): MetadataRoute.Sitemap {
  const caseStudies = getAllCaseStudies();
  const stories = getAllStories();

  const allDates = [
    ...caseStudies.map((cs) => new Date(cs.date)),
    ...stories.map((s) => new Date(s.date)),
  ];
  const latestDate =
    allDates.length > 0
      ? new Date(Math.max(...allDates.map((d) => d.getTime())))
      : new Date();

  const caseStudyEntries: MetadataRoute.Sitemap = caseStudies.map((cs) => ({
    url: `https://tap-and-swipe.com/case-studies/${cs.slug}`,
    lastModified: new Date(cs.updatedDate || cs.date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const storyEntries: MetadataRoute.Sitemap = stories.map((s) => ({
    url: `https://tap-and-swipe.com/stories/${s.slug}`,
    lastModified: new Date(s.date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: "https://tap-and-swipe.com",
      lastModified: latestDate,
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
      url: "https://tap-and-swipe.com/stories",
      lastModified: latestDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://tap-and-swipe.com/case-studies",
      lastModified: latestDate,
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
    ...storyEntries,
    ...caseStudyEntries,
  ];
}
