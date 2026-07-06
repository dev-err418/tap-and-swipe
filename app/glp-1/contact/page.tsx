import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Contact — GLP-1",
  description: "Contact Tap & Swipe about the GLP-1 shot tracker app.",
  alternates: {
    canonical: "/glp-1/contact",
  },
};

export default function GlpOneContactPage() {
  return (
    <AppLegalPage
      appName="GLP-1"
      appSlug="glp-1"
      contentPath="content/glp-1/contact.md"
      supportHref="/glp-1/contact"
      supportLabel="Contact"
    />
  );
}
