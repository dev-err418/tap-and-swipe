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
      contentPath="content/lua/support.md"
    />
  );
}
