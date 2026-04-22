import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LoginClient from "./login-client";

export const metadata: Metadata = {
  title: "Sign in",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { error } = await searchParams;

  const WHITELISTED_DISCORD_IDS = new Set([
    process.env.ADMIN_DISCORD_ID,
  ]);

  if (session) {
    const user = await prisma.user.findUnique({
      where: { discordId: session.discordId },
      select: { subscriptionStatus: true },
    });
    if (
      user?.subscriptionStatus === "active" ||
      WHITELISTED_DISCORD_IDS.has(session.discordId)
    ) {
      redirect("/learn");
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <LoginClient showNotSubscribed={error === "not_subscribed"} />
    </div>
  );
}
