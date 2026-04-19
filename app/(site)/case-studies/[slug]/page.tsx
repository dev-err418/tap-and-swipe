import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import {
  getAllCaseStudies,
  getAllCaseStudySlugs,
  getCaseStudyBySlug,
  type GuestInfo,
} from "@/lib/case-studies";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { extractToc } from "@/lib/toc";
import { DocsToc } from "@/components/docs-toc";
import { getAppData, type AppData } from "@/lib/app-data";
import { AppShowcase } from "@/components/app-showcase";
import { SiX, SiThreads, SiMastodon } from "@icons-pack/react-simple-icons";
import { Globe, Linkedin, Play } from "lucide-react";

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
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cs = getCaseStudyBySlug(slug);
  if (!cs) return {};

  const ogImage = cs.image
    ? { url: cs.image, alt: cs.imageAlt || cs.title }
    : { url: "/opengraph-image.png", width: 1200, height: 630 };

  return {
    title: cs.title,
    description: cs.description,
    keywords: cs.tags,
    openGraph: {
      type: "article",
      locale: "en_US",
      siteName: "Tap & Swipe",
      title: cs.title,
      description: cs.description,
      url: `${BASE_URL}/case-studies/${slug}`,
      publishedTime: new Date(cs.date).toISOString(),
      ...(cs.updatedDate && {
        modifiedTime: new Date(cs.updatedDate).toISOString(),
      }),
      tags: cs.tags,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@arthursbuilds",
      title: cs.title,
      description: cs.description,
      images: [cs.image || "/opengraph-image.png"],
    },
    alternates: {
      canonical: `/case-studies/${slug}`,
    },
  };
}

function FounderCard({ guest }: { guest: GuestInfo }) {
  const isPlaceholder =
    !guest.photo || guest.photo === "/guests/placeholder.webp";
  return (
    <div className="my-6 flex items-center gap-4 rounded-xl border border-border p-4">
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

function createMdxComponents(
  slugifyFn: (text: string) => string,
  guestInfo?: GuestInfo,
  appData?: AppData | null
) {
  return {
    FounderCard: () =>
      guestInfo ? <FounderCard guest={guestInfo} /> : null,
    YouTube: ({ id }: { id: string }) => (
      <div className="my-6 overflow-hidden rounded-xl">
        <AspectRatio ratio={16 / 9}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </AspectRatio>
      </div>
    ),
    h2: (props: React.ComponentProps<"h2">) => {
      const text =
        typeof props.children === "string" ? props.children : "";
      const isAppSection =
        /^what is\b/i.test(text) ||
        text.toLowerCase().replace(/^the\s+/, "") === "app";
      return (
        <>
          <h2
            id={slugifyFn(text)}
            className="mt-12 mb-4 text-2xl font-semibold tracking-tight scroll-mt-24"
            {...props}
          />
          {isAppSection && appData && <AppShowcase data={appData} />}
        </>
      );
    },
    h3: (props: React.ComponentProps<"h3">) => {
      const text =
        typeof props.children === "string" ? props.children : "";
      return (
        <h3
          id={slugifyFn(text)}
          className="mt-8 mb-3 text-xl font-semibold tracking-tight scroll-mt-24"
          {...props}
        />
      );
    },
    p: (props: React.ComponentProps<"p">) => (
      <p className="mb-5 leading-relaxed text-foreground/70" {...props} />
    ),
    a: ({ href, ...props }: React.ComponentProps<"a">) => {
      const isExternal = href?.startsWith("http");
      return (
        <a
          href={href}
          className="underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground/60"
          {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
          {...props}
        />
      );
    },
    ul: (props: React.ComponentProps<"ul">) => (
      <ul
        className="mb-5 ml-5 list-disc space-y-1.5 text-foreground/70"
        {...props}
      />
    ),
    ol: (props: React.ComponentProps<"ol">) => (
      <ol
        className="mb-5 ml-5 list-decimal space-y-1.5 text-foreground/70"
        {...props}
      />
    ),
    li: (props: React.ComponentProps<"li">) => (
      <li className="leading-relaxed" {...props} />
    ),
    blockquote: (props: React.ComponentProps<"blockquote">) => (
      <blockquote
        className="my-6 border-l-2 border-border pl-5 italic text-foreground/60"
        {...props}
      />
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

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cs = getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const otherCaseStudies = getAllCaseStudies()
    .filter((other) => other.slug !== slug)
    .slice(0, 3);

  const appData = getAppData(cs.appSlug || slug);
  const tocItems = extractToc(cs.content);
  const mdxComponents = createMdxComponents(slugify, cs.guestInfo, appData);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: cs.title,
      description: cs.description,
      datePublished: new Date(cs.date).toISOString(),
      dateModified: new Date(cs.updatedDate || cs.date).toISOString(),
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
      mainEntityOfPage: `${BASE_URL}/case-studies/${slug}`,
      ...(cs.image && {
        image: cs.image.startsWith("http")
          ? cs.image
          : `${BASE_URL}${cs.image}`,
      }),
      ...(cs.tags && { keywords: cs.tags.join(", ") }),
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
          name: "Case Studies",
          item: `${BASE_URL}/case-studies`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: cs.title,
          item: `${BASE_URL}/case-studies/${slug}`,
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

      <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
        <article>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {cs.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {cs.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/40">
            <time dateTime={cs.date}>{formatDate(cs.date)}</time>
            <span>{cs.readingTime} min read</span>
          </div>

          {/* Cross-link to story */}
          {cs.storySlug && (
            <Link
              href={`/stories/${cs.storySlug}`}
              className="mt-6 flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-accent"
            >
              <Play size={16} className="shrink-0 text-muted-foreground" />
              <span>Watch the interview &rarr;</span>
            </Link>
          )}

          {/* Featured image */}
          <div className="mt-8 overflow-hidden rounded-xl">
            <AspectRatio ratio={16 / 9}>
              {cs.image && cs.image !== PLACEHOLDER_IMAGE ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cs.image}
                  alt={cs.imageAlt || cs.title}
                  width={1200}
                  height={675}
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent">
                  <span className="text-sm text-muted-foreground">
                    No image
                  </span>
                </div>
              )}
            </AspectRatio>
          </div>

          {/* MDX content */}
          <div className="mt-12">
            <MDXRemote source={cs.content} components={mdxComponents} />
          </div>

          {/* You might also like */}
          {otherCaseStudies.length > 0 && (
            <section className="mt-32 border-t border-border pt-12 pb-20">
              <h3 className="mb-6 text-lg font-semibold tracking-tight">
                You might also like
              </h3>
              <div className="grid gap-5">
                {otherCaseStudies.map((other) => (
                  <Link
                    key={other.slug}
                    href={`/case-studies/${other.slug}`}
                    className="group flex gap-4 rounded-lg"
                  >
                    <div className="w-32 shrink-0 overflow-hidden rounded-lg bg-accent aspect-video">
                      {other.image && other.image !== PLACEHOLDER_IMAGE ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={other.image}
                          alt={other.title}
                          width={320}
                          height={180}
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
                        {other.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {other.description}
                      </p>
                      <time
                        dateTime={other.date}
                        className="mt-1 block text-xs text-foreground/30"
                      >
                        {formatDate(other.date)}
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
