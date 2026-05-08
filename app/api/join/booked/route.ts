import { NextRequest, NextResponse } from "next/server";
import { sendDiscordNotification } from "@/lib/discord-webhook";
import { markCalBookedInPlunk } from "@/lib/plunk";
import {
  HAS_APP_LABEL,
  REVENUE_LABEL,
  BUSINESS_TYPE_LABEL,
  BUDGET_LABEL,
} from "@/lib/join-labels";

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
    } = (await request.json()) as {
      firstName?: string;
      email?: string;
      hasApp?: string;
      revenue?: string;
      challenge?: string;
      businessType?: string;
      budget?: string;
    };

    if (!firstName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const country = request.headers.get("cf-ipcountry") || null;
    const leadsWebhook = process.env.DISCORD_WEBHOOK_LEADS_URL;

    const fields: { name: string; value: string; inline?: boolean }[] = [];
    if (budget) fields.push({ name: "Budget", value: BUDGET_LABEL[budget] ?? budget, inline: true });
    if (revenue) fields.push({ name: "MRR", value: REVENUE_LABEL[revenue] ?? revenue, inline: true });
    if (businessType)
      fields.push({ name: "Business Type", value: BUSINESS_TYPE_LABEL[businessType] ?? businessType, inline: true });
    if (hasApp) fields.push({ name: "Has App", value: HAS_APP_LABEL[hasApp] ?? hasApp, inline: true });
    fields.push({ name: "Country", value: country || "Unknown", inline: true });
    if (challenge?.trim()) fields.push({ name: "Biggest Challenge", value: challenge.trim() });

    sendDiscordNotification(
      "✅ Strategy Call Booked",
      `**${firstName.trim()}** (${email.trim()}) just booked their call`,
      fields,
      0x22c55e,
      leadsWebhook,
    ).catch(() => {});

    markCalBookedInPlunk(email.trim().toLowerCase(), firstName.trim()).catch(
      (err) => console.error("[plunk:cal-booked] failed:", err),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Booking notification error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
