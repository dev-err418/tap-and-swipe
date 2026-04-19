import { getAllEpisodes } from "@/lib/episodes";
import Link from "next/link";

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
      <h2 className="text-2xl font-semibold tracking-tight">Latest Episodes</h2>

      {/* Featured episode */}
      <Link
        href={`/episodes/${latest.slug}`}
        className="group mt-8 flex flex-col gap-6 sm:flex-row sm:items-start"
      >
        <div className="shrink-0 sm:w-1/2">
          <div className="relative w-full overflow-hidden rounded-xl pt-[56.25%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={latest.image || `https://img.youtube.com/vi/${latest.youtubeId}/maxresdefault.jpg`}
              alt={latest.title}
              width={800}
              height={450}
              className="absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-90"
            />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <time dateTime={latest.date}>{formatDate(latest.date)}</time>
            {latest.guest && <span>with {latest.guest}</span>}
          </div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight transition-colors group-hover:text-foreground/70 sm:text-3xl">
            {latest.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-muted-foreground">
            {latest.description}
          </p>
        </div>
      </Link>

      {/* Older episodes */}
      {shown.length > 0 && (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => (
            <Link
              key={s.slug}
              href={`/episodes/${s.slug}`}
              className="group"
            >
              <div className="relative w-full overflow-hidden rounded-xl pt-[56.25%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image || `https://img.youtube.com/vi/${s.youtubeId}/maxresdefault.jpg`}
                  alt={s.title}
                  width={800}
                  height={450}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-90"
                />
              </div>
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
                <h3 className="mt-1 font-semibold tracking-tight transition-colors group-hover:text-foreground/70">
                  {s.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-16 text-center">
        <Link
          href="/episodes"
          className="inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          See All Episodes &rarr;
        </Link>
      </div>
    </section>
  );
}
