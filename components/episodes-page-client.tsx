"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { SiApple, SiAndroid } from "@icons-pack/react-simple-icons";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { EpisodeMeta } from "@/lib/episodes";

export interface EpisodeWithGenres extends EpisodeMeta {
  genres?: string[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EpisodesPageClient({
  episodes,
}: {
  episodes: EpisodeWithGenres[];
}) {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<"all" | "ios" | "android">("all");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const s of episodes) {
      for (const g of s.genres ?? []) set.add(g);
    }
    return Array.from(set).sort();
  }, [episodes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return episodes.filter((s) => {
      if (q) {
        const haystack =
          `${s.title} ${s.description} ${s.guest ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (platform !== "all") {
        if (!s.tags?.includes(platform)) return false;
      }
      if (activeGenre) {
        if (!s.genres?.includes(activeGenre)) return false;
      }
      return true;
    });
  }, [episodes, search, platform, activeGenre]);

  return (
    <>
      {/* Search */}
      <div className="relative mt-10">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search episodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
        />
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border p-0.5">
          <button
            onClick={() => setPlatform("all")}
            className={`inline-flex cursor-pointer items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              platform === "all"
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setPlatform("ios")}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              platform === "ios"
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SiApple size={12} color="currentColor" /> iOS
          </button>
          <button
            onClick={() => setPlatform("android")}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              platform === "android"
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SiAndroid size={12} color="currentColor" /> Android
          </button>
        </div>

        {allGenres.length > 0 && (
          <>
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            {allGenres.map((genre) => (
              <button
                key={genre}
                onClick={() =>
                  setActiveGenre(activeGenre === genre ? null : genre)
                }
                className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                  activeGenre === genre
                    ? "bg-foreground text-background"
                    : "bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                {genre}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-foreground/40">
          No episodes match your filters.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Link
              key={s.slug}
              href={`/episodes/${s.slug}`}
              className="group"
            >
              <AspectRatio ratio={16 / 9}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image || `https://img.youtube.com/vi/${s.youtubeId}/maxresdefault.jpg`}
                  alt={s.title}
                  width={800}
                  height={450}
                  className="h-full w-full rounded-xl object-cover transition-opacity group-hover:opacity-90"
                />
              </AspectRatio>

              <div className="mt-3">
                <div className="text-sm text-muted-foreground">
                  <time dateTime={s.date}>{formatDate(s.date)}</time>
                  {s.guest && (
                    <>
                      <span className="mx-2">&middot;</span>
                      <span>with {s.guest}</span>
                    </>
                  )}
                </div>
                <h2 className="mt-1 font-semibold tracking-tight transition-colors group-hover:text-foreground/70">
                  {s.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {s.description}
                </p>
                {s.genres && s.genres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.genres.map((g) => (
                      <span
                        key={g}
                        className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
