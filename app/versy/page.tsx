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
    images: [{ url: "/community-icons/versy.jpg", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    creator: "@arthursbuilds",
    title: "Versy — Bible Verse Widget & Prayer",
    description:
      "Wake up to God's Word. Daily Bible verses, prayers, and devotionals on your lock screen and home screen. Download Versy on the App Store or Google Play.",
    images: ["/community-icons/versy.jpg"],
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
    ratingValue: "4.7",
    ratingCount: "411",
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
        rating={4.7}
        ratingCount={411}
        features={features}
        screenshots={[
          "/screenshots/versy/1.webp",
          "/screenshots/versy/2.webp",
          "/screenshots/versy/3.webp",
          "/screenshots/versy/4.webp",
          "/screenshots/versy/5.webp",
          "/screenshots/versy/6.webp",
          "/screenshots/versy/7.webp",
          "/screenshots/versy/8.webp",
        ]}
        reviews={[
          {
            author: "21 ketty",
            date: "Apr 16, 2026",
            text: "Wonderful, 10/10. Loved it!",
          },
          {
            author: "Eliude",
            date: "Apr 7, 2026",
            text: "Being in communion with Jesus. Great app.",
          },
          {
            author: "Terra norte",
            date: "Apr 8, 2026",
            text: "Jesus. 10 out of 10.",
          },
          {
            author: "Sabedoria1000",
            date: "Apr 5, 2026",
            text: "David. 10 out of 10.",
          },
        ]}
        tint={{
          accent: "#d4a860",
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
