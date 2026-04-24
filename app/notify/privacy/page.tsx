import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Notify",
  description:
    "Privacy policy for Notify, the personal push-notification webhook app.",
  alternates: {
    canonical: "/notify/privacy",
  },
};

export default function NotifyPrivacyPage() {
  return (
    <AppLegalPage
      appName="Notify"
      appSlug="notify"
      contentPath="content/notify/privacy.md"
    />
  );
}
