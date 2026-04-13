import Link from "next/link";
import { getAllEpisodes } from "@/lib/episodes";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EpisodesSection() {
  const episodes = getAllEpisodes();
  if (episodes.length === 0) return null;

  const [latest, ...older] = episodes;
  const shown = older.slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Latest Episodes</h2>
        <Link
          href="/episodes"
          className="text-sm text-black/40 transition-colors hover:text-black/70"
        >
          View all &rarr;
        </Link>
      </div>

      {/* Latest episode — big card */}
      <Link
        href={`/episodes/${latest.slug}`}
        className="group mt-8 block rounded-2xl border border-black/10 p-6 transition-colors hover:border-black/20 sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/40">
          <time dateTime={latest.date}>{formatDate(latest.date)}</time>
          <span>{latest.readingTime} min read</span>
          {latest.guest && <span>with {latest.guest}</span>}
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight transition-colors group-hover:text-black/70 sm:text-3xl">
          {latest.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-black/50">
          {latest.description}
        </p>
        {latest.tags && latest.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {latest.tags.map((tag) => (
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

      {/* Older episodes grid */}
      {shown.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((ep) => (
            <Link
              key={ep.slug}
              href={`/episodes/${ep.slug}`}
              className="group rounded-2xl border border-black/10 p-5 transition-colors hover:border-black/20"
            >
              <div className="text-sm text-black/40">
                <time dateTime={ep.date}>{formatDate(ep.date)}</time>
                <span className="mx-2">&middot;</span>
                <span>{ep.readingTime} min</span>
              </div>
              <h3 className="mt-2 font-semibold tracking-tight transition-colors group-hover:text-black/70">
                {ep.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-sm text-black/50">
                {ep.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
