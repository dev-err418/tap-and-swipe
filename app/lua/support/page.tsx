import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Support — Lua",
  description: "Get help and support for Lua, the pregnancy tracker app.",
  alternates: {
    canonical: "/lua/support",
  },
};

export default function LuaSupportPage() {
  return (
    <AppLegalPage
      appName="Lua"
      appSlug="lua"
      primaryColor="#D6779A"
      backgroundColor="#FFF8F2"
      textColor="#2D2D3A"
      mutedColor="#9B9BAB"
      contentPath="content/lua/support.md"
    />
  );
}
