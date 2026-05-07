import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotification } from "@/lib/discord-webhook";
import {
  HAS_APP_LABEL,
  REVENUE_LABEL,
  BUSINESS_TYPE_LABEL,
  BUDGET_LABEL,
} from "@/lib/join-labels";

const VALID_HAS_APP = ["revenue", "no-revenue", "no"];
const VALID_REVENUES = ["under-1k", "1k-5k", "5k-20k", "20k-50k", "50k-plus"];
const VALID_BUSINESS_TYPES = ["individual", "business"];
const VALID_BUDGETS = [
  "under-2000",
  "2000-4000",
  "4000-8000",
  "8000-plus",
  "not-sure",
];
const VALID_ROUTES = ["coaching", "community"];

export async function POST(request: NextRequest) {
  try {
    const {
      firstName,
      email,
      hasApp,
      revenue,
      challenge,
      businessType,
      budget,
      route,
      ref,
    } = (await request.json()) as {
      firstName: string;
      email: string;
      hasApp: string;
      revenue?: string;
      challenge?: string;
      businessType?: string;
      budget?: string;
      route: string;
      ref?: string;
    };

    if (
      !firstName?.trim() ||
      !email?.trim() ||
      !VALID_HAS_APP.includes(hasApp) ||
      (revenue !== undefined && !VALID_REVENUES.includes(revenue)) ||
      !VALID_BUSINESS_TYPES.includes(businessType ?? "") ||
      (budget !== undefined && !VALID_BUDGETS.includes(budget)) ||
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
        businessType: businessType ?? null,
        budget: budget ?? null,
        route,
        ref: ref || null,
        country,
      },
    });

    if (route === "coaching") {
      const leadsWebhook = process.env.DISCORD_WEBHOOK_LEADS_URL;
      sendDiscordNotification(
        "High-Ticket Lead — Reached Cal Step",
        `**${firstName.trim()}** (${email.trim()}) qualified and reached the Cal booking step`,
        [
          ...(budget ? [{ name: "Budget", value: BUDGET_LABEL[budget] ?? budget, inline: true }] : []),
          ...(revenue ? [{ name: "MRR", value: REVENUE_LABEL[revenue] ?? revenue, inline: true }] : []),
          { name: "Business Type", value: businessType ? BUSINESS_TYPE_LABEL[businessType] ?? businessType : "unknown", inline: true },
          { name: "Has App", value: HAS_APP_LABEL[hasApp] ?? hasApp, inline: true },
          { name: "Country", value: country || "Unknown", inline: true },
          ...(challenge?.trim() ? [{ name: "Biggest Challenge", value: challenge.trim() }] : []),
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
