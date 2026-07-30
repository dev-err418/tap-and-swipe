import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Piko",
  description:
    "Privacy policy for Piko, the personal hydration companion for iPhone.",
  alternates: {
    canonical: "/piko/privacy",
  },
};

export default function PikoPrivacyPage() {
  return (
    <AppLegalPage
      appName="Piko"
      appSlug="piko"
      contentPath="content/piko/privacy.md"
      showSupportLink={false}
    />
  );
}
