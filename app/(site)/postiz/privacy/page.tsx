import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Postiz Tap & Swipe",
  description: "How TAP & SWIPE SAS handles data in its hosted Postiz service.",
  alternates: { canonical: "/postiz/privacy" },
};

export default function PostizPrivacyPage() {
  return (
    <AppLegalPage
      appName="Postiz Tap & Swipe"
      appSlug="postiz"
      contentPath="content/postiz/privacy.md"
      showSupportLink={false}
    />
  );
}
