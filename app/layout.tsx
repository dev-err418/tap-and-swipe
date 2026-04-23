import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const uncutSans = localFont({
  src: "./fonts/UncutSans-Variable.woff2",
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
    template: "%s — Tap & Swipe",
  },
  description:
    "Tap & Swipe — indie developer studio building mobile apps and helping others do the same. Makers of Versy, Lua, Glow, and the AppSprint program.",
  keywords: [
    "Tap & Swipe",
    "indie app developer",
    "mobile app studio",
    "indie maker",
    "mobile apps",
    "app development",
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
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Tap & Swipe — Build & Launch Mobile Apps" }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
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
  alternateName: "Tap and Swipe",
  url: "https://tap-and-swipe.com",
  logo: "https://tap-and-swipe.com/icon.png",
  description:
    "Indie developer studio building mobile apps and helping others do the same. Makers of Versy, Lua, Glow, and the AppSprint program.",
  founder: {
    "@type": "Person",
    name: "Arthur Spalanzani",
    jobTitle: "Founder",
    url: "https://www.youtube.com/@ArthurBuildsStuff",
  },
  sameAs: [
    "https://www.youtube.com/@ArthurBuildsStuff",
    "https://www.linkedin.com/in/arthur-spalanzani/",
    "https://x.com/arthursbuilds",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "arthurs.dev@gmail.com",
    contactType: "customer support",
  },
  legalName: "TAP & SWIPE SAS",
  taxID: "100454206",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(w,d,s,u,n,a,b){if(w[n])return;a=w[n]={q:[],t:+new Date,s:[],o:u,track:function(){a.q.push([+new Date].concat([].slice.call(arguments)))},setScope:function(){a.s=[].slice.call(arguments).filter(function(x){return typeof x==="string"});a.q.push([+new Date,"setScope"].concat(a.s))},scope:function(){var c=[].slice.call(arguments);return{track:function(){a.q.push([+new Date].concat([].slice.call(arguments)).concat([{__scope:c}]))}}}};b=d.createElement(s);b.async=1;b.src=u+"/s.js";d.getElementsByTagName(s)[0].parentNode.insertBefore(b,d.getElementsByTagName(s)[0])}(window,document,"script","https://t.whop.tw","whop");whop.setScope("biz_MMXfuc0MqViuzQ");whop.track("page");`,
          }}
        />
      </head>
      <body
        className={`${uncutSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
