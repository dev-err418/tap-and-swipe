import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Postiz social publishing",
  description:
    "Learn how Tap & Swipe uses its hosted Postiz service to connect social channels, prepare posts, and publish content.",
  alternates: { canonical: "/postiz" },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Postiz Tap & Swipe",
  applicationCategory: "SocialNetworkingApplication",
  operatingSystem: "Web",
  url: "https://postiz.tap-and-swipe.com",
  description:
    "A hosted Postiz workspace for preparing, scheduling, and publishing social media content.",
  provider: {
    "@type": "Organization",
    name: "TAP & SWIPE SAS",
    url: "https://tap-and-swipe.com",
  },
};

export default function PostizPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Tap &amp; Swipe service
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        Postiz social publishing
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        Tap &amp; Swipe hosts a Postiz workspace at postiz.tap-and-swipe.com.
        Authorized users can connect their social accounts, prepare posts with
        text and media, choose publishing settings, and schedule or publish to
        supported channels, including TikTok.
      </p>

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-medium">
        <Link href="/postiz/terms" className="underline underline-offset-4">
          Terms of Service
        </Link>
        <Link href="/postiz/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        <a href="mailto:support@tap-and-swipe.com" className="underline underline-offset-4">
          Contact support
        </a>
      </div>

      <section className="mt-16 space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-6 leading-relaxed text-muted-foreground">
            <li>Sign in to the Tap &amp; Swipe Postiz workspace.</li>
            <li>Choose a channel and authorize the connection on that platform.</li>
            <li>Create a post, attach media, and select the available posting options.</li>
            <li>Publish immediately or schedule the post for later.</li>
          </ol>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">TikTok integration</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            With your permission, the TikTok connection uses TikTok Login Kit
            to identify the account and the Content Posting API to send posts or
            uploads you request. TikTok controls the available privacy settings,
            posting limits, and final publication. You can revoke access from
            your TikTok account settings.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Access and support</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            This hosted workspace currently requires an authorized account. For
            access questions, support, or a privacy request, email{" "}
            <a className="underline" href="mailto:support@tap-and-swipe.com">
              support@tap-and-swipe.com
            </a>
            . The service is operated by TAP &amp; SWIPE SAS in France.
          </p>
        </div>
      </section>

      <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        <p>Read the <Link href="/postiz/terms" className="underline">Terms of Service</Link> and <Link href="/postiz/privacy" className="underline">Privacy Policy</Link> before using the workspace.</p>
      </div>
    </main>
  );
}
