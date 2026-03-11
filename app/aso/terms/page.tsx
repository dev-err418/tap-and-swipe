import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — App Sprint ASO",
  description:
    "Terms of service for App Sprint ASO, the macOS App Store Optimization tool.",
  alternates: {
    canonical: "/aso/terms",
  },
};

export default function ASOTermsPage() {
  return (
    <AppLegalPage
      appName="App Sprint ASO"
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
