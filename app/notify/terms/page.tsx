import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — Notify",
  description:
    "Terms of use for Notify, the personal push-notification webhook app.",
  alternates: {
    canonical: "/notify/terms",
  },
};

export default function NotifyTermsPage() {
  return (
    <AppLegalPage
      appName="Notify"
      appSlug="notify"
      contentPath="content/notify/terms.md"
    />
  );
}
