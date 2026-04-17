import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — Lua",
  description: "Terms of use for Lua, the pregnancy tracker app.",
  alternates: {
    canonical: "/lua/terms",
  },
};

export default function LuaTermsPage() {
  return (
    <AppLegalPage
      appName="Lua"
      appSlug="lua"
      contentPath="content/lua/terms.md"
    />
  );
}
