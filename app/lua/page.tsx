import type { Metadata } from "next";
import AppLandingPage from "@/components/app-landing";

export const metadata: Metadata = {
  title: "Bump Chat — Pregnancy Tracker & Kick Counter",
  description:
    "Track your pregnancy week by week. Kick counter, contraction timer, bump photo journal, and hospital bag checklist. Download Bump Chat on the App Store.",
  keywords: [
    "pregnancy tracker app",
    "kick counter app",
    "contraction timer",
    "baby size tracker",
    "due date calculator",
    "pregnancy week by week",
    "pregnancy app",
    "baby tracker app",
    "pregnancy journal",
    "prenatal app",
    "expecting mom app",
    "pregnancy countdown",
    "bump chat",
  ],
  openGraph: {
    title: "Bump Chat — Pregnancy Tracker & Kick Counter",
    description:
      "Track your pregnancy week by week. Kick counter, contraction timer, bump photo journal, and hospital bag checklist. Download Bump Chat on the App Store.",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/community-icons/bump-chat.jpg", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    creator: "@arthursbuilds",
    title: "Bump Chat — Pregnancy Tracker & Kick Counter",
    description:
      "Track your pregnancy week by week. Kick counter, contraction timer, bump photo journal, and hospital bag checklist. Download Bump Chat on the App Store.",
    images: ["/community-icons/bump-chat.jpg"],
  },
  alternates: {
    canonical: "/lua",
  },
};

const bumpChatJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Bump Chat - Pregnancy Tracker",
  description:
    "Track your pregnancy week by week. Kick counter, contraction timer, bump photo journal, and hospital bag checklist.",
  applicationCategory: "HealthApplication",
  operatingSystem: "iOS",
  author: {
    "@type": "Organization",
    name: "Tap & Swipe",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    ratingCount: "8",
    bestRating: "5",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  downloadUrl: "https://apps.apple.com/app/id6759303663",
};

const features = [
  {
    title: "💬 AI Pregnancy Chat Assistant",
    description:
      "Ask any question about symptoms, nutrition, or what to expect. Get helpful answers instantly.",
  },
  {
    title: "📅 Pregnancy Week by Week Tracker",
    description:
      "See your baby's size and development milestones every week, from week 4 all the way to 40.",
  },
  {
    title: "👣 Baby Kick Counter",
    description:
      "Count movements with a single tap. Save sessions and share kick reports with your doctor.",
  },
  {
    title: "⏱️ Contraction Timer for Labor",
    description:
      "Track how long contractions last, how often they come, and the rest time in between.",
  },
];

export default function LuaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bumpChatJsonLd) }}
      />
      <AppLandingPage
        name="Bump Chat"
        tagline="Baby Kick & Contraction Timer"
        description="Bump Chat takes you through your pregnancy week by week. Each week shows how big your baby is (with fun size comparisons), what's developing, and what to expect. Got a question about symptoms, nutrition, or what's normal? Ask the built-in AI chat and get answers right away. Count kicks with a single tap and save the session to share with your doctor. When contractions start, the built-in timer tracks duration and frequency so you can tell when it's time to go. There's also a bump photo journal to capture your growth month by month and a hospital bag checklist to make sure you're ready."
        iconUrl="/community-icons/bump-chat.jpg"
        appStoreUrl="https://apps.apple.com/app/id6759303663"
        rating={5.0}
        ratingCount={8}
        features={features}
        screenshots={[
          "/screenshots/lua/1.webp",
          "/screenshots/lua/2.webp",
          "/screenshots/lua/3.webp",
          "/screenshots/lua/4.webp",
          "/screenshots/lua/5.webp",
          "/screenshots/lua/6.webp",
          "/screenshots/lua/7.webp",
          "/screenshots/lua/8.webp",
          "/screenshots/lua/9.webp",
          "/screenshots/lua/10.webp",
        ]}
        tint={{
          accent: "#D6779A",
          buttonBg: "#C4547A",
          buttonRing: "rgba(196, 84, 122, 0.25)",
        }}
        legal={{
          privacyUrl: "/lua/privacy",
          termsUrl: "/lua/terms",
          supportUrl: "/lua/support",
        }}
      />
    </>
  );
}
