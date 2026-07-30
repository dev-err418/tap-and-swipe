import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Piko — Privacy & Terms",
  description:
    "Privacy Policy and Terms of Use for Piko, the personal hydration companion for iPhone.",
  alternates: {
    canonical: "/piko",
  },
};

const pikoLegalJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Piko — Privacy & Terms",
  description:
    "Privacy Policy and Terms of Use for the Piko hydration app.",
  url: "https://tap-and-swipe.com/piko",
  isPartOf: {
    "@type": "WebSite",
    name: "Tap & Swipe",
    url: "https://tap-and-swipe.com",
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Tap & Swipe",
        item: "https://tap-and-swipe.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Piko",
        item: "https://tap-and-swipe.com/piko",
      },
    ],
  },
};

const legalDocuments = [
  {
    href: "/piko/privacy",
    title: "Privacy Policy",
    description:
      "How Piko handles hydration records, preferences, reminders, widgets, and subscription data.",
  },
  {
    href: "/piko/terms",
    title: "Terms of Use",
    description:
      "The rules and conditions that apply when you download and use Piko.",
  },
];

export default function PikoLegalPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pikoLegalJsonLd),
        }}
      />

      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          Piko
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Privacy &amp; Terms
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          The legal information for Piko, your personal hydration companion.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {legalDocuments.map((document) => (
            <Link
              key={document.href}
              href={document.href}
              className="group rounded-3xl border border-border bg-card p-6 transition-colors hover:bg-muted/50"
            >
              <h2 className="text-xl font-semibold text-foreground">
                {document.title}
              </h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {document.description}
              </p>
              <span className="mt-5 inline-block text-sm font-semibold text-sky-600 transition-transform group-hover:translate-x-1">
                Read document →
              </span>
            </Link>
          ))}
        </div>

        <footer className="mt-14 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">TAP &amp; SWIPE SAS</p>
          <a
            href="mailto:support@tap-and-swipe.com"
            className="mt-1 inline-block underline transition-opacity hover:opacity-70"
          >
            support@tap-and-swipe.com
          </a>
        </footer>
      </main>
    </>
  );
}
