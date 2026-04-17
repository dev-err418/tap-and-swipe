import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Support — Versy",
  description: "Get help and support for Versy, the Bible verse widget & prayer app.",
  alternates: {
    canonical: "/versy/support",
  },
};

export default function VersySupportPage() {
  return (
    <AppLegalPage
      appName="Versy"
      appSlug="versy"
      contentPath="content/versy/support.md"
    />
  );
}
