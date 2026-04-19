import type { Metadata } from "next";
import { getAllEpisodes } from "@/lib/episodes";
import { getAppData } from "@/lib/app-data";
import {
  EpisodesPageClient,
  type EpisodeWithGenres,
} from "@/components/episodes-page-client";

export const metadata: Metadata = {
  title: "Episodes",
  description:
    "Video interviews with mobile app builders. Watch founders share how they built, grew, and monetized their apps.",
  openGraph: {
    title: "Episodes — Tap & Swipe",
    description:
      "Video interviews with mobile app builders. Watch founders share how they built, grew, and monetized their apps.",
    url: "https://tap-and-swipe.com/episodes",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "Episodes — Tap & Swipe",
    description:
      "Video interviews with mobile app builders. Real stories, real numbers.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/episodes",
  },
};

export default function EpisodesPage() {
  const episodes = getAllEpisodes();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Episodes — Tap & Swipe",
    itemListElement: episodes.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://tap-and-swipe.com/episodes/${s.slug}`,
    })),
  };

  const enriched: EpisodeWithGenres[] = episodes.map((s) => {
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
          Episodes
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Video interviews with app builders, from first idea to first dollar.
        </p>

        <EpisodesPageClient episodes={enriched} />
      </div>
    </>
  );
}
