import type { Metadata } from "next";
import AppLandingPage from "@/components/app-landing";

export const metadata: Metadata = {
  title: "Bill Splitter & Tip Calculator — Divvy",
  description:
    "Split bills, calculate tips, and track who owes what. Itemized splits, shared dishes, and split history. Download Divvy on the App Store.",
  keywords: [
    "bill splitter app",
    "tip calculator",
    "split bill app",
    "restaurant bill splitter",
    "split the check",
    "bill splitting app",
    "tip calculator app",
    "group expenses",
    "split expenses",
    "dining calculator",
  ],
  openGraph: {
    title: "Bill Splitter & Tip Calculator — Divvy",
    description:
      "Split bills, calculate tips, and track who owes what. Itemized splits, shared dishes, and split history. Download Divvy on the App Store.",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/community-icons/divvy.jpg", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    creator: "@arthursbuilds",
    title: "Bill Splitter & Tip Calculator — Divvy",
    description:
      "Split bills, calculate tips, and track who owes what. Itemized splits, shared dishes, and split history. Download Divvy on the App Store.",
    images: ["/community-icons/divvy.jpg"],
  },
  alternates: {
    canonical: "/divvy",
  },
};

const divvyJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Bill Splitter & Tip - Divvy",
  description:
    "Split bills, calculate tips, and track who owes what. Itemized splits, shared dishes, and split history.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "iOS",
  author: {
    "@type": "Organization",
    name: "Tap & Swipe",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  downloadUrl: "https://apps.apple.com/app/id6760489459",
};

const features = [
  {
    title: "🧮 Tip Calculator & Bill Splitter",
    description:
      "Enter the total, set the tip, and see what everyone owes right away.",
  },
  {
    title: "🍽️ Itemized Bill Splitting",
    description:
      "Assign each item to whoever ordered it. Shared dishes get divided evenly across the group.",
  },
  {
    title: "👥 Split the Check with Friends",
    description:
      "Handle shared appetizers, bottles, and group plates so nobody ends up overpaying.",
  },
  {
    title: "📋 Restaurant Expense Tracker",
    description:
      "All your past splits are saved. Pull up any meal to check who paid what.",
  },
];

export default function DivvyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(divvyJsonLd) }}
      />
      <AppLandingPage
        slug="divvy"
        name="Divvy"
        tagline="Split Check & Settle Up Fast"
        description="Divvy does the math when it's time to split the bill. Out with friends, dinner with coworkers, group trip, whatever. Enter the total, add a tip, and split it equally or go item by item. You can assign dishes to each person, divide shared plates across the table, and see what everyone owes. Past splits are saved so you can look them up later, and you can send the breakdown over text or social media in one tap."
        iconUrl="/community-icons/divvy.jpg"
        appStoreUrl="https://apps.apple.com/app/id6760489459"
        features={features}
        screenshots={[
          "/screenshots/divvy/1.webp",
          "/screenshots/divvy/2.webp",
          "/screenshots/divvy/3.webp",
          "/screenshots/divvy/4.webp",
          "/screenshots/divvy/5.webp",
          "/screenshots/divvy/6.webp",
          "/screenshots/divvy/7.webp",
        ]}
        tint={{
          accent: "#059669",
          buttonBg: "#059669",
          buttonRing: "rgba(5, 150, 105, 0.25)",
        }}
        legal={{
          privacyUrl: "/divvy/privacy",
          termsUrl: "/divvy/terms",
          supportUrl: "/divvy/support",
        }}
      />
    </>
  );
}
