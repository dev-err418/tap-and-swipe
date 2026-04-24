import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Support — Notify",
  description:
    "Get help and support for Notify, the personal push-notification webhook app.",
  alternates: {
    canonical: "/notify/support",
  },
};

export default function NotifySupportPage() {
  return (
    <AppLegalPage
      appName="Notify"
      appSlug="notify"
      contentPath="content/notify/support.md"
    />
  );
}
