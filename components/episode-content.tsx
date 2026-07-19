import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { Episode, EpisodeMeta, GuestInfo } from "@/lib/episodes";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { getAppData, type AppData } from "@/lib/app-data";
import { getCaseStudyBySlug } from "@/lib/case-studies";
import { AppShowcase } from "@/components/app-showcase";
import {
  SiInstagram,
  SiMastodon,
  SiThreads,
  SiX,
} from "@icons-pack/react-simple-icons";
import { Globe, Linkedin, Github } from "lucide-react";

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
        {guest.instagram && (
          <a
            href={guest.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Instagram"
          >
            <SiInstagram size={16} color="currentColor" />
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
        {guest.github && (
          <a
            href={guest.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="GitHub"
          >
            <Github size={16} />
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function getAppHeadingNames(appData?: AppData | null): string[] {
  const title = appData?.ios?.title ?? appData?.android?.title ?? "";
  return Array.from(
    new Set(
      [title, ...title.split(/\s+-\s+|:/)]
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );
}

function isPrimaryAppSection(text: string, appData?: AppData | null): boolean {
  const normalizedText = slugify(text);
  const appNames = getAppHeadingNames(appData);

  if (normalizedText === "app" || normalizedText === "the-app") return true;
  if (appNames.length === 0) return false;

  return appNames.some(
    (appName) => normalizedText === `what-is-${slugify(appName)}`
  );
}

function stripEpisodeCta(content: string): string {
  return content.replace(
    /\n---\n\n## Where can I (?:watch|hear) the full episode\?[\s\S]*$/m,
    ""
  );
}

function createMdxComponents(
  appData?: AppData | null,
  revenueAtRecording?: string,
  recordedAt?: string
) {
  return {
    FounderCard: () => null,
    AppShowcase: ({
      appSlug,
      revenueAtRecording: rar,
      recordedAt: ra,
    }: {
      appSlug: string;
      revenueAtRecording?: string;
      recordedAt?: string;
    }) => {
      const inlineData = getAppData(appSlug);
      if (!inlineData) return null;
      return (
        <AppShowcase
          data={inlineData}
          revenueAtRecording={rar}
          recordedAt={ra}
        />
      );
    },
    h2: (props: React.ComponentProps<"h2">) => {
      const text = typeof props.children === "string" ? props.children : "";
      const isAppSection = isPrimaryAppSection(text, appData);
      return (
        <>
          <h2
            id={slugify(text)}
            className="mt-12 mb-4 text-2xl font-semibold tracking-tight scroll-mt-24"
            {...props}
          />
          {isAppSection && appData && (
            <AppShowcase
              data={appData}
              revenueAtRecording={revenueAtRecording}
              recordedAt={recordedAt}
            />
          )}
        </>
      );
    },
    h3: (props: React.ComponentProps<"h3">) => {
      const text = typeof props.children === "string" ? props.children : "";
      return (
        <h3
          id={slugify(text)}
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
    table: (props: React.ComponentProps<"table">) => (
      <div className="my-6 overflow-x-auto">
        <table className="w-full text-sm" {...props} />
      </div>
    ),
    thead: (props: React.ComponentProps<"thead">) => (
      <thead className="border-b border-border" {...props} />
    ),
    th: (props: React.ComponentProps<"th">) => (
      <th
        className="px-3 py-2 text-left font-semibold text-foreground"
        {...props}
      />
    ),
    td: (props: React.ComponentProps<"td">) => (
      <td
        className="border-t border-border px-3 py-2 text-foreground/70"
        {...props}
      />
    ),
    hr: () => <hr className="my-10 border-border" />,
    em: (props: React.ComponentProps<"em">) => (
      <em className="text-muted-foreground" {...props} />
    ),
  };
}

export function EpisodeContent({
  episode,
  otherEpisodes,
}: {
  episode: Episode;
  otherEpisodes: EpisodeMeta[];
}) {
  const pairedCaseStudy = episode.caseStudySlug
    ? getCaseStudyBySlug(episode.caseStudySlug)
    : null;
  const article = pairedCaseStudy ?? episode;
  const articleContent = pairedCaseStudy
    ? stripEpisodeCta(pairedCaseStudy.content)
    : episode.content;
  const appData = article.appSlug ? getAppData(article.appSlug) : null;
  const mdxComponents = createMdxComponents(
    appData,
    article.revenueAtRecording,
    article.recordedAt
  );

  return (
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
      {articleContent && (
        <div className="mt-8">
          <MDXRemote
            source={articleContent}
            components={mdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </div>
      )}

      {/* App showcase */}
      {!pairedCaseStudy && appData && (
        <div className="mt-10">
          <AppShowcase
            data={appData}
            revenueAtRecording={episode.revenueAtRecording}
            recordedAt={episode.recordedAt}
          />
        </div>
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
  );
}
