import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "API Docs — Notify",
  description:
    "Developer documentation for Notify's webhook API. Send push notifications with cURL, JavaScript, Python, or Go — all fields, all examples.",
  alternates: {
    canonical: "/notify/docs",
  },
};

export default function NotifyDocsPage() {
  return (
    <AppLegalPage
      appName="Notify"
      appSlug="notify"
      contentPath="content/notify/docs.md"
    />
  );
}
