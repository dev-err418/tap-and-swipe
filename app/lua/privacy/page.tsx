import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Lua",
  description: "Privacy policy for Lua, the pregnancy tracker app.",
  alternates: {
    canonical: "/lua/privacy",
  },
};

export default function LuaPrivacyPage() {
  return (
    <AppLegalPage
      appName="Lua"
      appSlug="lua"
      contentPath="content/lua/privacy.md"
    />
  );
}
