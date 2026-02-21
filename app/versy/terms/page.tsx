import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — Versy",
  description: "Terms of use for Versy, the Bible verse widget & prayer app.",
  alternates: {
    canonical: "/versy/terms",
  },
};

export default function VersyTermsPage() {
  return (
    <AppLegalPage
      appName="Versy"
      appSlug="versy"
      primaryColor="#d4a860"
      backgroundColor="#f0ebe3"
      textColor="#292a2b"
      mutedColor="#8a8784"
      contentPath="content/versy/terms.md"
    />
  );
}
