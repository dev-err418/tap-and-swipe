import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Versy",
  description: "Privacy policy for Versy, the Bible verse widget & prayer app.",
  alternates: {
    canonical: "/versy/privacy",
  },
};

export default function VersyPrivacyPage() {
  return (
    <AppLegalPage
      appName="Versy"
      appSlug="versy"
      contentPath="content/versy/privacy.md"
    />
  );
}
