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
      primaryColor="#d4a860"
      backgroundColor="#f0ebe3"
      textColor="#292a2b"
      mutedColor="#8a8784"
      contentPath="content/versy/support.md"
    />
  );
}
