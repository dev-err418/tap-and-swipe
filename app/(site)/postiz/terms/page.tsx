import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Postiz Tap & Swipe",
  description: "Terms for using the TAP & SWIPE SAS hosted Postiz service.",
  alternates: { canonical: "/postiz/terms" },
};

export default function PostizTermsPage() {
  return (
    <AppLegalPage
      appName="Postiz Tap & Swipe"
      appSlug="postiz"
      contentPath="content/postiz/terms.md"
      showSupportLink={false}
    />
  );
}
