import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import {
  getAllEpisodeSlugs,
  getAllEpisodes,
  getEpisodeBySlug,
  type GuestInfo,
} from "@/lib/episodes";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { getAppData } from "@/lib/app-data";
import { AppShowcase } from "@/components/app-showcase";
import { SiX, SiThreads, SiMastodon } from "@icons-pack/react-simple-icons";
import { Globe, Linkedin, FileText } from "lucide-react";

const BASE_URL = "https://tap-and-swipe.com";

export async function generateStaticParams() {
  return getAllEpisodeSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) return {};

  const thumbnail = `https://img.youtube.com/vi/${episode.youtubeId}/maxresdefault.jpg`;

  return {
    title: episode.title,
    description: episode.description,
    keywords: episode.tags,
    openGraph: {
      type: "video.other",
      locale: "en_US",
      siteName: "Tap & Swipe",
      title: episode.title,
      description: episode.description,
      url: `${BASE_URL}/episodes/${slug}`,
      images: [{ url: thumbnail, width: 1280, height: 720 }],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@arthursbuilds",
      title: episode.title,
      description: episode.description,
      images: [thumbnail],
    },
    alternates: {
      canonical: `/episodes/${slug}`,
    },
  };
}

function GuestCard({ guest }: { guest: GuestInfo }) {
  const isPlaceholder =
    !guest.photo || guest.photo === "/guests/placeholder.webp";
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-accent">
        {!isPlaceholder ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={guest.photo!}
            alt={guest.name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
            {guest.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{guest.name}</p>
        {guest.role && (
          <p className="text-sm text-muted-foreground">{guest.role}</p>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {guest.twitter && (
          <a
            href={guest.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="X/Twitter"
          >
            <SiX size={16} color="currentColor" />
          </a>
        )}
        {guest.linkedin && (
          <a
            href={guest.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="LinkedIn"
          >
            <Linkedin size={16} />
          </a>
        )}
        {guest.threads && (
          <a
            href={guest.threads}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Threads"
          >
            <SiThreads size={16} color="currentColor" />
          </a>
        )}
        {guest.mastodon && (
          <a
            href={guest.mastodon}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Mastodon"
          >
            <SiMastodon size={16} color="currentColor" />
          </a>
        )}
        {guest.website && (
          <a
            href={guest.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Website"
          >
            <Globe size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) notFound();

  const appData = episode.appSlug ? getAppData(episode.appSlug) : null;
  const otherEpisodes = getAllEpisodes()
    .filter((s) => s.slug !== slug)
    .slice(0, 3);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: episode.title,
      description: episode.description,
      thumbnailUrl: `https://img.youtube.com/vi/${episode.youtubeId}/maxresdefault.jpg`,
      uploadDate: new Date(episode.date).toISOString(),
      embedUrl: `https://www.youtube-nocookie.com/embed/${episode.youtubeId}`,
      ...(episode.guest && {
        contributor: { "@type": "Person", name: episode.guest },
      }),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Episodes",
          item: `${BASE_URL}/episodes`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: episode.title,
          item: `${BASE_URL}/episodes/${slug}`,
        },
      ],
    },
  ];

  const mdxComponents = {
    FounderCard: () => null,
    p: (props: React.ComponentProps<"p">) => (
      <p className="mb-5 leading-relaxed text-foreground/70" {...props} />
    ),
    a: (props: React.ComponentProps<"a">) => (
      <a
        className="underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground/60"
        {...props}
      />
    ),
    strong: (props: React.ComponentProps<"strong">) => (
      <strong className="font-semibold text-foreground" {...props} />
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        {/* YouTube embed or coming soon */}
        <div className="overflow-hidden rounded-xl">
          <AspectRatio ratio={16 / 9}>
            {episode.youtubeId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${episode.youtubeId}`}
                title={episode.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-accent">
                <span className="text-sm text-muted-foreground">
                  Coming soon
                </span>
              </div>
            )}
          </AspectRatio>
        </div>

        {/* Title + date */}
        <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">
          {episode.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/40">
          <time dateTime={episode.date}>{formatDate(episode.date)}</time>
          {episode.guest && <span>with {episode.guest}</span>}
        </div>

        {/* Guest card */}
        {episode.guestInfo && (
          <div className="mt-6">
            <GuestCard guest={episode.guestInfo} />
          </div>
        )}

        {/* Body */}
        {episode.content && (
          <div className="mt-8">
            <MDXRemote source={episode.content} components={mdxComponents} />
          </div>
        )}

        {/* App showcase */}
        {appData && (
          <div className="mt-10">
            <AppShowcase data={appData} />
          </div>
        )}

        {/* Cross-link to case study */}
        {episode.caseStudySlug && (
          <Link
            href={`/case-studies/${episode.caseStudySlug}`}
            className="mt-8 flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <FileText size={16} className="shrink-0 text-muted-foreground" />
            <span>Read the full case study &rarr;</span>
          </Link>
        )}

        {/* More episodes */}
        {otherEpisodes.length > 0 && (
          <section className="mt-20 border-t border-border pt-12 pb-20">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">
                More episodes
              </h3>
              <Link
                href="/episodes"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                See all episodes &rarr;
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {otherEpisodes.map((s) => (
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
                      width={480}
                      height={270}
                      className="h-full w-full rounded-xl object-cover transition-opacity group-hover:opacity-90"
                    />
                  </AspectRatio>
                  <div className="mt-3">
                    <p className="font-semibold leading-snug transition-colors group-hover:text-foreground/60">
                      {s.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
