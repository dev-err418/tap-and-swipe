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
    "Browse every Tap & Swipe episode. Real stories from indie app makers — the ideas, the grind, and what finally worked.",
  openGraph: {
    title: "All Episodes — Tap & Swipe",
    description:
      "Browse every Tap & Swipe episode. Real stories from indie app makers — the ideas, the grind, and what finally worked.",
    url: "https://tap-and-swipe.com/episodes",
  },
  alternates: {
    canonical: "/episodes",
  },
};

export default function EpisodesPage() {
  const episodes = getAllEpisodes();

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
    <div className="mx-auto w-full max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        All Episodes
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Every conversation with an app builder, from first idea to first dollar.
      </p>

      <EpisodesPageClient episodes={enriched} />
    </div>
  );
}
