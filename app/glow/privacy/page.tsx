import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Glow",
  description: "Privacy policy for Glow, the daily affirmations app.",
  alternates: {
    canonical: "/glow/privacy",
  },
};

export default function GlowPrivacyPage() {
  return (
    <AppLegalPage
      appName="Glow"
      appSlug="glow"
      contentPath="content/glow/privacy.md"
    />
  );
}
