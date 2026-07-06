import type { Metadata } from "next";
import AppLandingPage from "@/components/app-landing";

export const metadata: Metadata = {
  title: "GLP-1 Shot Tracker — Medication & Weight Journey",
  description:
    "Track GLP-1 shots, doses, injection sites, schedules, and weight progress in a simple iPhone app. Built by Tap & Swipe.",
  keywords: [
    "GLP-1 tracker",
    "GLP-1 shot tracker",
    "semaglutide tracker",
    "tirzepatide tracker",
    "weight loss shot tracker",
    "medication tracker",
    "injection tracker",
    "dose tracker",
    "weight journey app",
  ],
  openGraph: {
    title: "GLP-1 Shot Tracker — Medication & Weight Journey",
    description:
      "Track GLP-1 shots, doses, injection sites, schedules, and weight progress in a simple iPhone app.",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/community-icons/glp-1.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    creator: "@arthursbuilds",
    title: "GLP-1 Shot Tracker — Medication & Weight Journey",
    description:
      "Track GLP-1 shots, doses, injection sites, schedules, and weight progress in a simple iPhone app.",
    images: ["/community-icons/glp-1.png"],
  },
  alternates: {
    canonical: "/glp-1",
  },
};

const glpOneJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GLP-1 Shot Tracker",
  description:
    "Track GLP-1 shots, doses, injection sites, schedules, and weight progress in a simple iPhone app.",
  applicationCategory: "HealthApplication",
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
};

const features = [
  {
    title: "💉 Shot history",
    description:
      "Log each injection with the date, time, dose, medication name, and site so your routine stays easy to review.",
  },
  {
    title: "📅 Schedule reminders",
    description:
      "Keep your weekly or custom shot cadence visible, with a clear next-shot view when you open the app.",
  },
  {
    title: "⚖️ Weight progress",
    description:
      "Track your current weight, goal weight, and progress over time without turning the app into a complicated spreadsheet.",
  },
  {
    title: "🔒 Local-first privacy",
    description:
      "No account and no Tap & Swipe server database for your GLP-1 health entries. Your routine stays on your device.",
  },
];

export default function GlpOnePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glpOneJsonLd) }}
      />
      <AppLandingPage
        slug="glp-1"
        name="GLP-1"
        tagline="Shot Tracker & Weight Journey"
        description="GLP-1 is a calm tracker for people taking weekly weight-management medications. Log your shots, dose, injection site, and timing, then keep an eye on your weight journey without a noisy dashboard. The app is built for the ordinary rhythm of treatment: remember what you took, see what's next, and keep enough context for your own notes or conversations with your clinician. It is not medical advice, and it does not replace your healthcare provider."
        iconUrl="/community-icons/glp-1.png"
        features={features}
        tint={{
          accent: "#E35B74",
          buttonBg: "#E35B74",
          buttonRing: "rgba(227, 91, 116, 0.25)",
        }}
        legal={{
          privacyUrl: "/glp-1/privacy",
          termsUrl: "/glp-1/terms",
          supportUrl: "/glp-1/contact",
          supportLabel: "Contact",
        }}
      />
    </>
  );
}
