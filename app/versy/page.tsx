import type { Metadata } from "next";
import AppLandingPage from "@/components/app-landing";

export const metadata: Metadata = {
  title: "Versy — Bible Verse Widget & Prayer",
  description:
    "Wake up to God's Word. Daily Bible verses, prayers, and devotionals on your lock screen and home screen. Download Versy on the App Store or Google Play.",
  keywords: [
    "bible verse app",
    "bible verse widget",
    "prayer app",
    "devotional app",
    "bible widget iPhone",
    "daily bible verse",
    "scripture app",
    "bible verse of the day",
    "christian app",
    "bible app widget",
    "morning devotional",
    "prayer journal app",
  ],
  openGraph: {
    title: "Versy — Bible Verse Widget & Prayer",
    description:
      "Wake up to God's Word. Daily Bible verses, prayers, and devotionals on your lock screen and home screen. Download Versy on the App Store or Google Play.",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "Versy — Bible Verse Widget & Prayer",
    description:
      "Wake up to God's Word. Daily Bible verses, prayers, and devotionals on your lock screen and home screen. Download Versy on the App Store or Google Play.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/versy",
  },
};

const versyJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Versy - Bible Verse & Prayer",
  description:
    "Wake up to God's Word. Daily Bible verses, prayers, and devotionals on your lock screen and home screen.",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "iOS, Android",
  author: {
    "@type": "Organization",
    name: "Tap & Swipe",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.55",
    ratingCount: "11",
    bestRating: "5",
  },
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  ],
  downloadUrl: "https://apps.apple.com/app/id6756516842",
};

const features = [
  {
    title: "📖 Bible Verse Widget for iPhone",
    description:
      "Put daily scripture on your lock screen or home screen. A new verse every time you check your phone.",
  },
  {
    title: "🌅 Daily Bible Verse of the Day",
    description:
      "A fresh Bible verse and faith-based quote waiting for you every morning.",
  },
  {
    title: "🙏 Prayer & Devotional Journal",
    description:
      "Track your devotional streak, set reminders, and keep a personal prayer journal.",
  },
  {
    title: "🎨 Christian Wallpapers & Themes",
    description:
      "Animated, light, dark, and seasonal themes with scripture backgrounds for your device.",
  },
];

export default function VersyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(versyJsonLd) }}
      />
      <AppLandingPage
        name="Versy"
        tagline="Daily Quote Lock Screen Widget"
        description="Versy puts scripture right on your phone. Add a widget to your lock screen or home screen and you'll see a new Bible verse every time you pick up your device. There are animated, light, dark, and seasonal themes so it looks the way you want. Set morning reminders to build a daily devotional streak, keep a prayer journal, and share scripture images with friends and family on social media."
        iconUrl="/community-icons/versy.jpg"
        appStoreUrl="https://apps.apple.com/app/id6756516842"
        playStoreUrl="https://play.google.com/store/apps/details?id=com.tapandswipe.versy"
        rating={4.55}
        ratingCount={11}
        features={features}
        tint={{
          bg: "#f0ebe3",
          accent: "#d4a860",
          text: "#3d3225",
          muted: "#7a6b57",
          buttonBg: "#c4943d",
          buttonRing: "rgba(196, 148, 61, 0.25)",
        }}
        legal={{
          privacyUrl: "/versy/privacy",
          termsUrl: "/versy/terms",
          supportUrl: "/versy/support",
        }}
      />
    </>
  );
}
