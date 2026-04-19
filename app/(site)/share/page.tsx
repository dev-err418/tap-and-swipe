import type { Metadata } from "next";
import { ShareForm } from "@/components/ShareForm";

const BASE_URL = "https://tap-and-swipe.com";

export const metadata: Metadata = {
  title: "Share Your Story on Tap & Swipe",
  description:
    "Built an app? Share your story on Tap & Swipe — a video interview + written case study published to 20K+ YouTube subscribers and the Tap & Swipe community.",
  openGraph: {
    title: "Share Your Story — Tap & Swipe",
    description:
      "Built an app? Share your story on Tap & Swipe — a video interview + written case study published to 20K+ YouTube subscribers.",
    url: `${BASE_URL}/share`,
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "Share Your Story — Tap & Swipe",
    description:
      "Built an app? Share your story on Tap & Swipe — a video interview + written case study published to 20K+ YouTube subscribers.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/share",
  },
};

export default function SharePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Share your story on Tap &amp; Swipe
      </h1>

      <div className="mt-10">
        <p className="mb-5 leading-relaxed text-foreground/70">
          Tap &amp; Swipe is a show where mobile app builders share the real
          story behind their apps. Every episode is a video interview + a
          written case study with real numbers, real lessons, and the stuff you
          don&apos;t usually hear about.
        </p>
        <p className="mb-5 leading-relaxed text-foreground/70">
          If you&apos;ve built an app and have a story worth telling, I&apos;d
          love to hear from you.
        </p>

        <hr className="my-10 border-border" />

        <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight">
          Why come on the show?
        </h2>
        <p className="mb-5 leading-relaxed text-foreground/70">
          Your episode gets published as a video on YouTube (20K+ subscribers)
          and as a detailed case study on tap-and-swipe.com. It&apos;s free
          exposure for you and your app, a backlink to your website, and a
          piece of content you can share everywhere.
        </p>
        <p className="mb-5 leading-relaxed text-foreground/70">
          You also get in front of a growing community of mobile app builders
          who actually care about how things are built, not just the revenue
          number.
        </p>
        <p className="mb-5 leading-relaxed text-foreground/70">
          There&apos;s no cost. You just show up and talk about what you built.
        </p>

        <hr className="my-10 border-border" />

        <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="mb-5 ml-5 list-decimal space-y-1.5 text-foreground/70">
          <li className="leading-relaxed">Submit your info below</li>
          <li className="leading-relaxed">I&apos;ll review it and reach out if it&apos;s a fit</li>
          <li className="leading-relaxed">
            We hop on a quick 15-20 min intro call to find the best angle
          </li>
          <li className="leading-relaxed">
            I send you a doc with the questions so you can review everything
          </li>
          <li className="leading-relaxed">We record</li>
          <li className="leading-relaxed">Nothing goes live without your approval</li>
        </ol>

        <hr className="my-10 border-border" />

        <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight">
          Submit your info
        </h2>
        <ShareForm />
      </div>
    </div>
  );
}
