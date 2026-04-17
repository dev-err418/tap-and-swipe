import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Support — Divvy",
  description: "Get help and support for Divvy, the bill splitting app.",
  alternates: {
    canonical: "/divvy/support",
  },
};

export default function DivvySupportPage() {
  return (
    <AppLegalPage
      appName="Divvy"
      appSlug="divvy"
      contentPath="content/divvy/support.md"
    />
  );
}
