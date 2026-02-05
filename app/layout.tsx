import type { Metadata } from "next";
import localFont from "next/font/local";
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
    <html lang="en">
      <body
        className={`${uncutSans.variable} ${crimsonPro.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
