import type { Metadata } from "next";
import Image from "next/image";
import { PartnershipsForm } from "@/components/PartnershipsForm";

const BASE_URL = "https://tap-and-swipe.com";

export const metadata: Metadata = {
  title: "Partner with ArthurBuildsStuff",
  description:
    "Partner with ArthurBuildsStuff to get your brand in front of 20K+ mobile app builders across YouTube, the website, and the newsletter.",
  openGraph: {
    title: "Partner with ArthurBuildsStuff",
    description:
      "Partner with ArthurBuildsStuff to get your brand in front of 20K+ mobile app builders across YouTube, the website, and the newsletter.",
    url: `${BASE_URL}/partnerships`,
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "Partner with ArthurBuildsStuff",
    description:
      "Partner with ArthurBuildsStuff to get your brand in front of 20K+ mobile app builders across YouTube, the website, and the newsletter.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/partnerships",
  },
};

export default function PartnershipsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <Image
        src="/arthur-profile.webp"
        alt="Arthur, creator of ArthurBuildsStuff"
        width={400}
        height={400}
        priority
        className="mb-5 h-20 w-20 rounded-full object-cover"
      />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Partner with ArthurBuildsStuff
      </h1>

      <div className="mt-10">
        <p className="mb-5 leading-relaxed text-foreground/70">
          Want to get your brand in front of ArthurBuildsStuff&apos;s audience
          of mobile app builders? We&apos;d love to work with you.
        </p>
        <p className="mb-5 leading-relaxed text-foreground/70">
          To learn more about our partnership offerings, fill out the form
          below.
        </p>

        <PartnershipsForm />
      </div>
    </div>
  );
}
