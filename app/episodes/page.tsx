import type { Metadata } from "next";
import Link from "next/link";
import { getAllEpisodes } from "@/lib/episodes";

export const metadata: Metadata = {
  title: "Episodes",
  description:
    "Every episode of Tap & Swipe — real stories from people building mobile apps.",
  alternates: {
    canonical: "/episodes",
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EpisodesPage() {
  const episodes = getAllEpisodes();

  return (
    <>
      <style>{`html, body { background-color: #fff !important; }`}</style>
      <main className="relative z-10 flex flex-col bg-white text-black selection:bg-black/10">
        {/* Navbar */}
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
              alt="ArthurBuildsStuff"
              className="h-8 w-8 rounded-full"
            />
            <span className="text-sm font-semibold text-black/90">
              Tap &amp; Swipe
            </span>
          </Link>
        </nav>

        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Episodes
          </h1>
          <p className="mt-4 text-lg text-black/50">
            Real stories from people building mobile apps.
          </p>

          {episodes.length === 0 ? (
            <p className="mt-16 text-black/40">No episodes yet. Check back soon.</p>
          ) : (
            <div className="mt-12 divide-y divide-black/10">
              {episodes.map((ep) => (
                <Link
                  key={ep.slug}
                  href={`/episodes/${ep.slug}`}
                  className="group block py-8 first:pt-0"
                >
                  <article>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/40">
                      <time dateTime={ep.date}>{formatDate(ep.date)}</time>
                      <span>{ep.readingTime} min read</span>
                      {ep.guest && <span>with {ep.guest}</span>}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-black/70">
                      {ep.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-black/50">
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
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
