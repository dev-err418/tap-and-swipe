import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — GLP-1",
  description: "Privacy policy for GLP-1, the shot tracker and weight journey app.",
  alternates: {
    canonical: "/glp-1/privacy",
  },
};

export default function GlpOnePrivacyPage() {
  return (
    <AppLegalPage
      appName="GLP-1"
      appSlug="glp-1"
      contentPath="content/glp-1/privacy.md"
      supportHref="/glp-1/contact"
      supportLabel="Contact"
    />
  );
}
