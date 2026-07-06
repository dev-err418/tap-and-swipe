import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — GLP-1",
  description: "Terms of use for GLP-1, the shot tracker and weight journey app.",
  alternates: {
    canonical: "/glp-1/terms",
  },
};

export default function GlpOneTermsPage() {
  return (
    <AppLegalPage
      appName="GLP-1"
      appSlug="glp-1"
      contentPath="content/glp-1/terms.md"
      supportHref="/glp-1/contact"
      supportLabel="Contact"
    />
  );
}
