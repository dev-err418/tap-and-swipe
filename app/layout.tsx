import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";

const crimsonPro = localFont({
  src: "./fonts/CrimsonPro-Variable.ttf",
  variable: "--font-crimson",
  display: "swap",
});

const uncutSans = localFont({
  src: "./fonts/UncutSans-Variable.ttf",
  variable: "--font-uncut",
  display: "swap",
});

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#2a2725",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tap-and-swipe.com"),
  title: {
    default: "Tap & Swipe — Build & Launch Mobile Apps",
    template: "%s | Tap & Swipe",
  },
  description:
    "Build and launch your own mobile app with App Sprint — the 6-week program for indie makers using Expo, React Native, and AI. Join 51+ builders shipping real apps.",
  keywords: [
    "build a mobile app",
    "mobile app builder",
    "app sprint",
    "indie maker",
    "launch an app",
    "expo app development",
    "react native course",
    "mobile app course",
    "app development program",
    "ship a mobile app",
  ],
  authors: [{ name: "Arthur", url: "https://www.youtube.com/@ArthurBuildsStuff" }],
  creator: "Tap & Swipe",
  publisher: "Tap & Swipe",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.webmanifest",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Tap & Swipe",
  url: "https://tap-and-swipe.com",
  logo: "https://tap-and-swipe.com/icon.png",
  founder: {
    "@type": "Person",
    name: "Arthur",
    url: "https://www.youtube.com/@ArthurBuildsStuff",
  },
  sameAs: ["https://www.youtube.com/@ArthurBuildsStuff"],
  contactPoint: {
    "@type": "ContactPoint",
    email: "arthurs.dev@gmail.com",
    contactType: "customer support",
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script id="datafast-queue" dangerouslySetInnerHTML={{ __html: `
          window.datafast = window.datafast || function() {
            window.datafast.q = window.datafast.q || [];
            window.datafast.q.push(arguments);
          };
        `}} />
      </head>
      <body
        className={`${uncutSans.variable} ${crimsonPro.variable} antialiased`}
      >
        {children}
        <Analytics />
        <Script
          src="https://datafa.st/js/script.js"
          data-website-id="dfid_fqRTu2yRpBPRr2oQQzUig"
          data-domain="tap-and-swipe.com"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
