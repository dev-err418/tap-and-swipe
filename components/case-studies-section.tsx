import { getAllCaseStudies } from "@/lib/case-studies";
import Link from "next/link";

const PLACEHOLDER_IMAGE = "/episodes/placeholder.webp";

function isRealImage(image?: string): image is string {
  return !!image && image !== PLACEHOLDER_IMAGE;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CaseStudyThumbnail({
  image,
  alt,
  className,
}: {
  image?: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="relative w-full overflow-hidden rounded-xl pt-[56.25%]">
        {isRealImage(image) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={alt}
            width={800}
            height={450}
            className="absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-90"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-accent">
            <span className="text-sm text-muted-foreground">No image</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CaseStudiesSection() {
  const caseStudies = getAllCaseStudies();
  if (caseStudies.length === 0) return null;

  const [latest, ...older] = caseStudies;
  const shown = older.slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <h2 className="text-2xl font-semibold tracking-tight">
        Latest Case Studies
      </h2>

      {/* Featured case study */}
      <Link
        href={`/case-studies/${latest.slug}`}
        className="group mt-8 flex flex-col gap-6 sm:flex-row sm:items-start"
      >
        <CaseStudyThumbnail
          image={latest.image}
          alt={latest.imageAlt || latest.title}
          className="shrink-0 sm:w-1/2"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <time dateTime={latest.date}>{formatDate(latest.date)}</time>
            <span>{latest.readingTime} min read</span>
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

      {/* Older case studies */}
      {shown.length > 0 && (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((cs) => (
            <Link
              key={cs.slug}
              href={`/case-studies/${cs.slug}`}
              className="group"
            >
              <CaseStudyThumbnail
                image={cs.image}
                alt={cs.imageAlt || cs.title}
              />
              <div className="mt-3">
                <div className="text-sm text-muted-foreground">
                  <time dateTime={cs.date}>{formatDate(cs.date)}</time>
                  <span className="mx-2">&middot;</span>
                  <span>{cs.readingTime} min read</span>
                </div>
                <h3 className="mt-1 font-semibold tracking-tight transition-colors group-hover:text-foreground/70">
                  {cs.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {cs.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-16 text-center">
        <Link
          href="/case-studies"
          className="inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          See All Case Studies &rarr;
        </Link>
      </div>
    </section>
  );
}
