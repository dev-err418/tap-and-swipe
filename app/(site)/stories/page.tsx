import type { Metadata } from "next";
import { getAllStories } from "@/lib/stories";
import { getAppData } from "@/lib/app-data";
import {
  StoriesPageClient,
  type StoryWithGenres,
} from "@/components/stories-page-client";

export const metadata: Metadata = {
  title: "Stories",
  description:
    "Video interviews with mobile app builders. Watch founders share how they built, grew, and monetized their apps.",
  openGraph: {
    title: "Stories — Tap & Swipe",
    description:
      "Video interviews with mobile app builders. Watch founders share how they built, grew, and monetized their apps.",
    url: "https://tap-and-swipe.com/stories",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "Stories — Tap & Swipe",
    description:
      "Video interviews with mobile app builders. Real stories, real numbers.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/stories",
  },
};

export default function StoriesPage() {
  const stories = getAllStories();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Stories — Tap & Swipe",
    itemListElement: stories.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://tap-and-swipe.com/stories/${s.slug}`,
    })),
  };

  const enriched: StoryWithGenres[] = stories.map((s) => {
    const appData = getAppData(s.appSlug || s.slug);
    const genreSet = new Set<string>();
    for (const g of appData?.ios?.genres ?? []) genreSet.add(g);
    for (const g of appData?.android?.genres ?? []) genreSet.add(g);
    const genres = genreSet.size > 0 ? Array.from(genreSet) : undefined;
    return { ...s, genres };
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Stories
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Video interviews with app builders, from first idea to first dollar.
        </p>

        <StoriesPageClient stories={enriched} />
      </div>
    </>
  );
}
