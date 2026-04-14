import type { Metadata } from "next";
import Link from "next/link";
import { getAllEpisodes } from "@/lib/episodes";

export const metadata: Metadata = {
  title: "All Episodes — Tap & Swipe",
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
    <main className="relative z-10 flex flex-col bg-background text-foreground selection:bg-black/10">
      {/* Navbar */}
      <nav className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground/90">Tap &amp; Swipe</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">by ArthurBuildsStuff</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/episodes" className="text-sm text-muted-foreground transition-colors hover:text-foreground/70">All Episodes</Link>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          All Episodes
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Every conversation with an app builder, from first idea to first dollar.
        </p>

        {episodes.length === 0 ? (
          <p className="mt-16 text-center text-foreground/40">
            No episodes yet — check back soon.
          </p>
        ) : (
          <div className="mt-12 flex flex-col gap-6">
            {episodes.map((ep) => (
              <Link
                key={ep.slug}
                href={`/${ep.slug}`}
                className="group rounded-2xl border border-border p-5 transition-colors hover:border-foreground/20 sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/40">
                  <time dateTime={ep.date}>{formatDate(ep.date)}</time>
                  <span>{ep.readingTime} min read</span>
                  {ep.guest && <span>with {ep.guest}</span>}
                </div>
                <h2 className="mt-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-foreground/70">
                  {ep.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-muted-foreground">
                  {ep.description}
                </p>
                {ep.tags && ep.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ep.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground"
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
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10 text-sm text-foreground/40">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="font-semibold text-foreground/80">Tap &amp; Swipe</p>
            <p className="mt-1 text-foreground/80">Made with ❤️ in 🇫🇷</p>
            <p className="mt-3">&copy; {new Date().getFullYear()} &middot; TAP &amp; SWIPE SAS</p>
            <p className="mt-1">SIREN: 100454206 &middot; TVA: FR23100454206</p>
          </div>
          <div>
            <p className="font-medium text-foreground/80">Products</p>
            <ul className="-mx-2 mt-2">
              <li>
                <Link href="/app-sprint-community" className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70">
                  AppSprint Community
                </Link>
              </li>
              <li>
                <Link href="/aso" className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70">
                  AppSprint ASO
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground/80">Social</p>
            <ul className="-mx-2 mt-2">
              <li>
                <a href="https://www.youtube.com/@ArthurBuildsStuff" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70">
                  YouTube
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/in/arthur-spalanzani/" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://x.com/arthursbuilds" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70">
                  X (Twitter)
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
