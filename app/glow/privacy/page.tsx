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
      primaryColor="#f54e08"
      backgroundColor="#FFF8F3"
      textColor="#2C3E5B"
      mutedColor="#6C757D"
      contentPath="content/glow/privacy.md"
    />
  );
}
