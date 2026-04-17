import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — AppSprint ASO",
  description:
    "Privacy policy for AppSprint ASO, the macOS App Store Optimization tool.",
  alternates: {
    canonical: "/aso/privacy",
  },
};

export default function ASOPrivacyPage() {
  return (
    <AppLegalPage
      appName="AppSprint ASO"
      appSlug="aso"
      contentPath="content/aso/privacy.md"
      showSupportLink={false}
    />
  );
}
