import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — App Sprint ASO",
  description:
    "Privacy policy for App Sprint ASO, the macOS App Store Optimization tool.",
  alternates: {
    canonical: "/aso/privacy",
  },
};

export default function ASOPrivacyPage() {
  return (
    <AppLegalPage
      appName="App Sprint ASO"
      appSlug="aso"
      primaryColor="#f4cf8f"
      backgroundColor="#2a2725"
      textColor="#f1ebe2"
      mutedColor="#c9c4bc"
      contentPath="content/aso/privacy.md"
      showSupportLink={false}
    />
  );
}
