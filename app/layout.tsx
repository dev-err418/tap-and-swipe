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
};

export const metadata: Metadata = {
  title: "Tap & Swipe",
  description: "Indie developer building mobile apps and helping others do the same",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
