import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — Piko",
  description:
    "Terms of use for Piko, the personal hydration companion for iPhone.",
  alternates: {
    canonical: "/piko/terms",
  },
};

export default function PikoTermsPage() {
  return (
    <AppLegalPage
      appName="Piko"
      appSlug="piko"
      contentPath="content/piko/terms.md"
      showSupportLink={false}
    />
  );
}
