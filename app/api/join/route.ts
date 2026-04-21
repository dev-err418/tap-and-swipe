import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotification } from "@/lib/discord-webhook";

const VALID_HAS_APP = ["revenue", "no-revenue", "idea", "scratch"];
const VALID_BUDGETS = ["under-500", "500-2000", "2000-3000", "4000-5000", "5000-plus"];
const VALID_ROUTES = ["coaching", "community"];

export async function POST(request: NextRequest) {
  try {
    const { firstName, email, hasApp, challenge, budget, route, ref } =
      (await request.json()) as {
        firstName: string;
        email: string;
        hasApp: string;
        challenge?: string;
        budget: string;
        route: string;
        ref?: string;
      };

    if (
      !firstName?.trim() ||
      !email?.trim() ||
      !VALID_HAS_APP.includes(hasApp) ||
      !VALID_BUDGETS.includes(budget) ||
      !VALID_ROUTES.includes(route)
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const country = request.headers.get("cf-ipcountry") || null;

    await prisma.quizLead.create({
      data: {
        firstName: firstName.trim(),
        email: email.trim().toLowerCase(),
        hasApp,
        challenge: challenge?.trim() || null,
        budget,
        route,
        ref: ref || null,
        country,
      },
    });

    if (route === "coaching") {
      const leadsWebhook = process.env.DISCORD_WEBHOOK_LEADS_URL;
      sendDiscordNotification(
        "High-Ticket Lead",
        `**${firstName.trim()}** (${email.trim()}) was redirected to Cal.com`,
        [
          { name: "Budget", value: budget, inline: true },
          { name: "Has App", value: hasApp, inline: true },
          { name: "Country", value: country || "Unknown", inline: true },
          ...(challenge?.trim() ? [{ name: "Challenge", value: challenge.trim() }] : []),
          ...(ref ? [{ name: "Ref", value: ref, inline: true }] : []),
        ],
        0xff9500,
        leadsWebhook,
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Quiz lead error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
