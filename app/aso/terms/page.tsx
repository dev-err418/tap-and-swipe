import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — AppSprint ASO",
  description:
    "Terms of service for AppSprint ASO, the macOS App Store Optimization tool.",
  alternates: {
    canonical: "/aso/terms",
  },
};

export default function ASOTermsPage() {
  return (
    <AppLegalPage
      appName="AppSprint ASO"
      appSlug="aso"
      primaryColor="#f4cf8f"
      backgroundColor="#2a2725"
      textColor="#f1ebe2"
      mutedColor="#c9c4bc"
      contentPath="content/aso/terms.md"
      showSupportLink={false}
    />
  );
}
