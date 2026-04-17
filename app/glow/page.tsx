import type { Metadata } from "next";
import AppLandingPage from "@/components/app-landing";

export const metadata: Metadata = {
  title: "Glow — Daily Affirmations & Mood Tracker",
  description:
    "Start your day with positive affirmations, mood tracking, and journaling. Lock screen widgets, beautiful themes, and categories for every mood. Download Glow on the App Store or Google Play.",
  keywords: [
    "affirmations app",
    "daily affirmations",
    "mood tracker app",
    "gratitude journal app",
    "self care app",
    "positive affirmations",
    "journaling app",
    "mental health app",
    "mindfulness app",
    "wellness app",
    "morning routine app",
    "self improvement app",
  ],
  openGraph: {
    title: "Glow — Daily Affirmations & Mood Tracker",
    description:
      "Start your day with positive affirmations, mood tracking, and journaling. Lock screen widgets, beautiful themes, and categories for every mood. Download Glow on the App Store or Google Play.",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "Glow — Daily Affirmations & Mood Tracker",
    description:
      "Start your day with positive affirmations, mood tracking, and journaling. Lock screen widgets, beautiful themes, and categories for every mood. Download Glow on the App Store or Google Play.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/glow",
  },
};

const glowJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Daily Affirmations - Glow",
  description:
    "Start your day with positive affirmations, mood tracking, and journaling. Lock screen widgets, beautiful themes, and categories for every mood.",
  applicationCategory: "HealthApplication",
  operatingSystem: "iOS, Android",
  author: {
    "@type": "Organization",
    name: "Tap & Swipe",
  },
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  ],
  downloadUrl: "https://apps.apple.com/app/id6753347459",
};

const features = [
  {
    title: "✨ Affirmation Widget for iPhone",
    description:
      "Put affirmations on your lock screen or home screen. A new one every time you check your phone.",
  },
  {
    title: "🌞 Daily Positive Affirmations",
    description:
      "A fresh message every morning with streak tracking to keep the habit going.",
  },
  {
    title: "💜 Mood Tracker & Self-Care Journal",
    description:
      "Log your mood and browse categories like anxiety, motivation, mindfulness, sleep, and self-love.",
  },
  {
    title: "🎨 Wellness Wallpapers & Themes",
    description:
      "Animated, light, dark, and seasonal themes to make your phone feel like yours.",
  },
];

export default function GlowPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glowJsonLd) }}
      />
      <AppLandingPage
        name="Glow"
        tagline="Mood Tracker & Journal"
        description="Glow gives you a fresh affirmation every morning. Set it as a widget on your lock screen or home screen so it's the first thing you see. Keep a streak going to build the habit. There are categories for anxiety, motivation, mindfulness, sleep, self-love, and more, so you can pick what fits your day. Switch between animated, light, dark, and seasonal themes. And when you find one you love, share it as a card on Instagram, TikTok, or wherever."
        iconUrl="/community-icons/glow.jpg"
        appStoreUrl="https://apps.apple.com/app/id6753347459"
        playStoreUrl="https://play.google.com/store/apps/details?id=com.tapandswipe.glow"
        features={features}
        screenshots={[
          "/screenshots/glow/1.webp",
          "/screenshots/glow/2.webp",
          "/screenshots/glow/3.webp",
          "/screenshots/glow/4.webp",
          "/screenshots/glow/5.webp",
          "/screenshots/glow/6.webp",
          "/screenshots/glow/7.webp",
          "/screenshots/glow/8.webp",
        ]}
        tint={{
          bg: "#FFF8F3",
          accent: "#f54e08",
          text: "#3d2b1e",
          muted: "#7a6252",
          buttonBg: "#e04400",
          buttonRing: "rgba(224, 68, 0, 0.25)",
        }}
        legal={{
          privacyUrl: "/glow/privacy",
          termsUrl: "/glow/terms",
          supportUrl: "/glow/support",
        }}
      />
    </>
  );
}
