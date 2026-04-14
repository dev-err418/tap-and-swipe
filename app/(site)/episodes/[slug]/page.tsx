import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllEpisodes, getAllSlugs, getEpisodeBySlug, type GuestInfo } from "@/lib/episodes";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { extractToc } from "@/lib/toc";
import { DocsToc } from "@/components/docs-toc";
import { getAppData, type AppData } from "@/lib/app-data";
import { AppShowcase } from "@/components/app-showcase";

const PLACEHOLDER_IMAGE = "/episodes/placeholder.webp";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const BASE_URL = "https://tap-and-swipe.com";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) return {};

  return {
    title: episode.title,
    description: episode.description,
    keywords: episode.tags,
    openGraph: {
      type: "article",
      title: episode.title,
      description: episode.description,
      url: `${BASE_URL}/episodes/${slug}`,
      publishedTime: new Date(episode.date).toISOString(),
      ...(episode.updatedDate && {
        modifiedTime: new Date(episode.updatedDate).toISOString(),
      }),
      tags: episode.tags,
      ...(episode.image && {
        images: [{ url: episode.image, alt: episode.imageAlt || episode.title }],
      }),
    },
    twitter: {
      title: episode.title,
      description: episode.description,
      ...(episode.image && { images: [episode.image] }),
    },
    alternates: {
      canonical: `/episodes/${slug}`,
    },
  };
}

function FounderCard({ guest }: { guest: GuestInfo }) {
  const isPlaceholder = !guest.photo || guest.photo === "/guests/placeholder.webp";
  return (
    <div className="my-6 flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-accent">
        {!isPlaceholder ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={guest.photo!} alt={guest.name} width={48} height={48} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
            {guest.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{guest.name}</p>
        {guest.role && <p className="text-sm text-muted-foreground">{guest.role}</p>}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {guest.twitter && (
          <a href={guest.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="X/Twitter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        )}
        {guest.linkedin && (
          <a href={guest.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="LinkedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
        )}
        {guest.website && (
          <a href={guest.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Website">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </a>
        )}
      </div>
    </div>
  );
}

function createMdxComponents(slugifyFn: (text: string) => string, guestInfo?: GuestInfo, appData?: AppData | null) {
  return {
  FounderCard: () => guestInfo ? <FounderCard guest={guestInfo} /> : null,
  h2: (props: React.ComponentProps<"h2">) => {
    const text = typeof props.children === "string" ? props.children : "";
    const isAppSection = text.toLowerCase().replace(/^the\s+/, "") === "app";
    return (
      <>
        <h2 id={slugifyFn(text)} className="mt-12 mb-4 text-2xl font-semibold tracking-tight scroll-mt-24" {...props} />
        {isAppSection && appData && <AppShowcase data={appData} />}
      </>
    );
  },
  h3: (props: React.ComponentProps<"h3">) => {
    const text = typeof props.children === "string" ? props.children : "";
    return <h3 id={slugifyFn(text)} className="mt-8 mb-3 text-xl font-semibold tracking-tight scroll-mt-24" {...props} />;
  },
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-5 leading-relaxed text-foreground/70" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a className="underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground/60" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mb-5 ml-5 list-disc space-y-1.5 text-foreground/70" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="mb-5 ml-5 list-decimal space-y-1.5 text-foreground/70" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => (
    <li className="leading-relaxed" {...props} />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote className="my-6 border-l-2 border-border pl-5 italic text-foreground/60" {...props} />
  ),
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  hr: () => <hr className="my-10 border-border" />,
  em: (props: React.ComponentProps<"em">) => (
    <em className="text-muted-foreground" {...props} />
  ),
};
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

  const otherEpisodes = getAllEpisodes()
    .filter((ep) => ep.slug !== slug)
    .slice(0, 3);

  const appData = getAppData(slug);
  const tocItems = extractToc(episode.content);
  const mdxComponents = createMdxComponents(slugify, episode.guestInfo, appData);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: episode.title,
      description: episode.description,
      datePublished: new Date(episode.date).toISOString(),
      ...(episode.updatedDate && {
        dateModified: new Date(episode.updatedDate).toISOString(),
      }),
      author: {
        "@type": "Person",
        name: "Arthur",
        url: "https://www.youtube.com/@ArthurBuildsStuff",
      },
      publisher: {
        "@type": "Organization",
        name: "Tap & Swipe",
        url: BASE_URL,
        logo: { "@type": "ImageObject", url: `${BASE_URL}/icon.png` },
      },
      mainEntityOfPage: `${BASE_URL}/episodes/${slug}`,
      ...(episode.image && {
        image: episode.image.startsWith("http")
          ? episode.image
          : `${BASE_URL}${episode.image}`,
      }),
      ...(episode.tags && { keywords: episode.tags.join(", ") }),
    },
    {
      "@context": "https://schema.org",
      "@type": "PodcastEpisode",
      name: episode.title,
      description: episode.description,
      datePublished: new Date(episode.date).toISOString(),
      url: `${BASE_URL}/episodes/${slug}`,
      timeRequired: `PT${episode.readingTime}M`,
      ...(episode.guest && {
        contributor: { "@type": "Person", name: episode.guest },
      }),
      partOfSeries: {
        "@type": "PodcastSeries",
        name: "Tap & Swipe",
        url: BASE_URL,
      },
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Two-column layout: article + sidebar */}
      <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
        <article>
          {/* Header */}
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {episode.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {episode.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/40">
            <time dateTime={episode.date}>{formatDate(episode.date)}</time>
            <span>{episode.readingTime} min read</span>
          </div>

          {/* Featured image */}
          <div className="mt-8 overflow-hidden rounded-xl">
            <AspectRatio ratio={16 / 9}>
              {episode.image && episode.image !== PLACEHOLDER_IMAGE ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={episode.image}
                  alt={episode.imageAlt || episode.title}
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent">
                  <span className="text-sm text-muted-foreground">No image</span>
                </div>
              )}
            </AspectRatio>
          </div>

          {/* MDX content */}
          <div className="mt-12">
            <MDXRemote source={episode.content} components={mdxComponents} />
          </div>

          {/* You might also like */}
          {otherEpisodes.length > 0 && (
            <section className="mt-32 border-t border-border pt-12 pb-20">
              <h3 className="mb-6 text-lg font-semibold tracking-tight">
                You might also like
              </h3>
              <div className="grid gap-5">
                {otherEpisodes.map((ep) => (
                  <Link
                    key={ep.slug}
                    href={`/episodes/${ep.slug}`}
                    className="group flex gap-4 rounded-lg"
                  >
                    <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-accent">
                      {ep.image && ep.image !== PLACEHOLDER_IMAGE ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ep.image}
                          alt={ep.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 py-0.5">
                      <p className="font-semibold leading-snug transition-colors group-hover:text-foreground/60">
                        {ep.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {ep.description}
                      </p>
                      <time dateTime={ep.date} className="mt-1 block text-xs text-foreground/30">
                        {formatDate(ep.date)}
                      </time>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Sidebar — Table of contents */}
        {tocItems.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <DocsToc items={tocItems} />
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
