import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Divvy",
  description: "Privacy policy for Divvy, the bill splitting app.",
  alternates: {
    canonical: "/divvy/privacy",
  },
};

export default function DivvyPrivacyPage() {
  return (
    <AppLegalPage
      appName="Divvy"
      appSlug="divvy"
      contentPath="content/divvy/privacy.md"
    />
  );
}
