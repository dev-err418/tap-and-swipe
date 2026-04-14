import type { Metadata } from "next";
import Link from "next/link";
import { getAllEpisodes } from "@/lib/episodes";

export const metadata: Metadata = {
  title: "Explore All Episodes — Tap & Swipe",
  description:
    "Browse every Tap & Swipe episode. Real stories from indie app makers — the ideas, the grind, and what finally worked.",
  openGraph: {
    title: "Explore All Episodes — Tap & Swipe",
    description:
      "Browse every Tap & Swipe episode. Real stories from indie app makers — the ideas, the grind, and what finally worked.",
    url: "https://tap-and-swipe.com/explore",
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ExplorePage() {
  const episodes = getAllEpisodes();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        All Episodes
      </h1>
      <p className="mt-3 text-lg text-black/50">
        Every conversation with an app builder, from first idea to first dollar.
      </p>

      {episodes.length === 0 ? (
        <p className="mt-16 text-center text-black/40">
          No episodes yet — check back soon.
        </p>
      ) : (
        <div className="mt-12 flex flex-col gap-6">
          {episodes.map((ep) => (
            <Link
              key={ep.slug}
              href={`/${ep.slug}`}
              className="group rounded-2xl border border-black/10 p-5 transition-colors hover:border-black/20 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/40">
                <time dateTime={ep.date}>{formatDate(ep.date)}</time>
                <span>{ep.readingTime} min read</span>
                {ep.guest && <span>with {ep.guest}</span>}
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-black/70">
                {ep.title}
              </h2>
              <p className="mt-1.5 line-clamp-2 text-black/50">
                {ep.description}
              </p>
              {ep.tags && ep.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ep.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs text-black/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
