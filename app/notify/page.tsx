import type { Metadata } from "next";
import AppLandingPage from "@/components/app-landing";

export const metadata: Metadata = {
  title: "Notify — Personal Push Webhook for iPhone",
  description:
    "Send yourself a push notification with a single HTTP request. On-device webhook URLs, no account, no tracking. Drop-in for scripts, cron jobs, CI alerts, and home automations. Download Notify on the App Store.",
  keywords: [
    "push notification api",
    "webhook to push notification",
    "http to push",
    "personal push notifications",
    "iphone webhook",
    "ios push webhook",
    "cron alert app",
    "ci cd notifications",
    "script notifications",
    "server alerts iphone",
    "developer tools ios",
    "apns webhook",
  ],
  openGraph: {
    title: "Notify — Personal Push Webhook for iPhone",
    description:
      "Send yourself a push notification with a single HTTP request. On-device webhook URLs, no account, no tracking. Download Notify on the App Store.",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/community-icons/notify.webp", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    creator: "@arthursbuilds",
    title: "Notify — Personal Push Webhook for iPhone",
    description:
      "Send yourself a push notification with a single HTTP request. On-device webhook URLs, no account, no tracking. Download Notify on the App Store.",
    images: ["/community-icons/notify.webp"],
  },
  alternates: {
    canonical: "/notify",
  },
};

const notifyJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Notify - Personal Push Webhook",
  description:
    "Send yourself a push notification with a single HTTP request. On-device webhook URLs, no account, no tracking.",
  applicationCategory: "DeveloperApplication",
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
  downloadUrl: "https://apps.apple.com/app/id6763496503",
};

const features = [
  {
    title: "🔔 Push via HTTP",
    description:
      "POST (or GET) to your webhook URL and a notification lands on your iPhone. JSON, form, query string, whatever your script can send.",
  },
  {
    title: "🔒 On-Device Secret",
    description:
      "Your webhook ID is generated on device and never leaves it except as part of the URL you choose to use. No account, no login, no email.",
  },
  {
    title: "⚙️ Rich Options",
    description:
      "Title, subtitle, body, sound, thread ID, interruption level, badge count, tap-to-open URL, image: all optional, all through the same endpoint.",
  },
  {
    title: "🧰 Built for Scripts & CI",
    description:
      "One-liner cURL, 3 lines in Python or JS. Drop it in cron jobs, GitHub Actions, home automations, or long-running builds.",
  },
];

export default function NotifyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(notifyJsonLd) }}
      />
      <AppLandingPage
        slug="notify"
        name="Notify"
        tagline="Personal Push Webhook"
        description="Notify turns your iPhone into a push-notification endpoint you can hit from anywhere. Open the app, copy your webhook URL, and any script, server, cron job, or CI pipeline can send you a notification with one HTTP request. No account. No tracking. Your webhook ID is generated on device — the server only holds the APNs device token it needs to deliver the push, nothing about what you send. It's the tool I always wanted: a dumb, reliable endpoint for 'build finished', 'cron job failed', 'door opened', or whatever else you want to know about."
        iconUrl="/community-icons/notify.webp"
        appStoreUrl="https://apps.apple.com/app/id6763496503"
        features={features}
        tint={{
          accent: "#E11D48",
          buttonBg: "#E11D48",
          buttonRing: "rgba(225, 29, 72, 0.25)",
        }}
        legal={{
          privacyUrl: "/notify/privacy",
          termsUrl: "/notify/terms",
          supportUrl: "/notify/support",
        }}
      />
    </>
  );
}
