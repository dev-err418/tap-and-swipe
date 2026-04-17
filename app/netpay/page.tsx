import type { Metadata } from "next";
import AppLandingPage from "@/components/app-landing";

export const metadata: Metadata = {
  title: "Paycheck Calculator & Tax Breakdown — NetPay",
  description:
    "Calculate your take-home pay, see tax breakdowns by state, and compare job offers side by side. All 50 states, 401(k), HSA, and more. Download NetPay on the App Store.",
  keywords: [
    "paycheck calculator",
    "take home pay calculator",
    "salary calculator",
    "net pay calculator",
    "tax calculator",
    "income tax calculator",
    "payroll calculator",
    "hourly to salary calculator",
    "state tax calculator",
    "401k calculator",
    "wage calculator",
    "pay estimate app",
  ],
  openGraph: {
    title: "Paycheck Calculator & Tax Breakdown — NetPay",
    description:
      "Calculate your take-home pay, see tax breakdowns by state, and compare job offers side by side. All 50 states, 401(k), HSA, and more. Download NetPay on the App Store.",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "Paycheck Calculator & Tax Breakdown — NetPay",
    description:
      "Calculate your take-home pay, see tax breakdowns by state, and compare job offers side by side. All 50 states, 401(k), HSA, and more. Download NetPay on the App Store.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/netpay",
  },
};

const netpayJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Paycheck Calculator - NetPay",
  description:
    "Calculate your take-home pay, see tax breakdowns by state, and compare job offers side by side.",
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
  downloadUrl: "https://apps.apple.com/app/id6760554617",
};

const features = [
  {
    title: "💰 Take-Home Pay Calculator",
    description:
      "Enter your salary or hourly rate and see your net pay after federal and state taxes.",
  },
  {
    title: "🗺️ State Income Tax Calculator",
    description:
      "Tax brackets for all 50 states, including SDI, PFL, and local payroll deductions.",
  },
  {
    title: "⚖️ Job Offer Comparison Tool",
    description:
      "Put two offers or relocation scenarios next to each other and compare the real take-home pay.",
  },
  {
    title: "🏦 401(k) & Benefits Deductions",
    description:
      "Add 401(k), health insurance, HSA, and FSA contributions to get an accurate result.",
  },
];

export default function NetPayPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(netpayJsonLd) }}
      />
      <AppLandingPage
        name="NetPay"
        tagline="Salary & Tax Breakdown"
        description="NetPay tells you what actually hits your bank account. Plug in your salary or hourly rate, pick your state, and get a full breakdown: federal taxes, state taxes, Social Security, Medicare. Add your 401(k), health insurance, HSA, and other pre-tax deductions to see your real take-home number. You can also put two job offers next to each other and compare the actual pay after taxes. Save different scenarios for raises, relocations, or new offers and pull them up whenever you need them."
        iconUrl="/community-icons/netpay.jpg"
        appStoreUrl="https://apps.apple.com/app/id6760554617"
        features={features}
        tint={{
          bg: "#0F0F1A",
          accent: "#818CF8",
          text: "#E8ECF5",
          muted: "#8F93AF",
          buttonBg: "#4F46E5",
          buttonRing: "rgba(79, 70, 229, 0.25)",
        }}
        legal={{
          privacyUrl: "/netpay/privacy",
          termsUrl: "/netpay/terms",
          supportUrl: "/netpay/support",
        }}
      />
    </>
  );
}
