import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — Divvy",
  description: "Terms of use for Divvy, the bill splitting app.",
  alternates: {
    canonical: "/divvy/terms",
  },
};

export default function DivvyTermsPage() {
  return (
    <AppLegalPage
      appName="Divvy"
      appSlug="divvy"
      contentPath="content/divvy/terms.md"
    />
  );
}
