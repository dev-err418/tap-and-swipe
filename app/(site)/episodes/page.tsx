import type { Metadata } from "next";
import { getAllEpisodes } from "@/lib/episodes";
import { getAppData } from "@/lib/app-data";
import {
  EpisodesPageClient,
  type EpisodeWithGenres,
} from "@/components/episodes-page-client";

export const metadata: Metadata = {
  title: "All Episodes",
  description:
    "Browse every Tap & Swipe episode. Mobile app builders share how they built, grew, and monetized their apps, with real revenue numbers and honest lessons.",
  openGraph: {
    title: "All Episodes — Tap & Swipe",
    description:
      "Browse every Tap & Swipe episode. Mobile app builders share how they built, grew, and monetized their apps, with real revenue numbers and honest lessons.",
    url: "https://tap-and-swipe.com/episodes",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "All Episodes — Tap & Swipe",
    description:
      "Browse every Tap & Swipe episode. Mobile app builders share how they built, grew, and monetized their apps.",
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
    name: "All Episodes — Tap & Swipe",
    itemListElement: episodes.map((ep, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://tap-and-swipe.com/episodes/${ep.slug}`,
    })),
  };

  const enriched: EpisodeWithGenres[] = episodes.map((ep) => {
    const appData = getAppData(ep.slug);
    // Deduplicate genres across iOS and Android
    const genreSet = new Set<string>();
    for (const g of appData?.ios?.genres ?? []) genreSet.add(g);
    for (const g of appData?.android?.genres ?? []) genreSet.add(g);
    const genres = genreSet.size > 0 ? Array.from(genreSet) : undefined;
    return { ...ep, genres };
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
    <div className="mx-auto w-full max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        All Episodes
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Every conversation with an app builder, from first idea to first dollar.
      </p>

      <EpisodesPageClient episodes={enriched} />
    </div>
    </>
  );
}
