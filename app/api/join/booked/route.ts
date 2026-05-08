import { NextRequest, NextResponse } from "next/server";
import { sendDiscordNotification } from "@/lib/discord-webhook";
import {
  HAS_APP_LABEL,
  REVENUE_LABEL,
  BUSINESS_TYPE_LABEL,
  BUDGET_LABEL,
} from "@/lib/join-labels";

const PLUNK_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Flips contact.data.calBooked = "true" and fires PLUNK_CAL_BOOKED_EVENT so
// the high-ticket Plunk workflow's condition steps short-circuit before the
// 1h / 24h reminder emails go out.
async function markCallBookedInPlunk(email: string, firstName: string) {
  const plunkUrl = process.env.PLUNK_API_URL;
  const plunkSecretKey = process.env.PLUNK_API_KEY;
  const plunkPublicKey = process.env.PLUNK_PUBLIC_KEY;
  const plunkEvent = process.env.PLUNK_CAL_BOOKED_EVENT;
  if (!plunkUrl || !plunkSecretKey) {
    console.error("[plunk:cal-booked] missing PLUNK_API_URL / PLUNK_API_KEY");
    return;
  }

  const data: Record<string, string> = {
    firstName,
    calBooked: "true",
  };

  try {
    const res = await fetchWithTimeout(
      `${plunkUrl}/contacts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${plunkSecretKey}`,
        },
        body: JSON.stringify({ email, data }),
      },
      PLUNK_TIMEOUT_MS
    );
    if (!res.ok) {
      console.error("[plunk:cal-booked] /contacts error:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[plunk:cal-booked] /contacts error:", err);
  }

  if (plunkPublicKey && plunkEvent) {
    try {
      const res = await fetchWithTimeout(
        `${plunkUrl}/v1/track`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${plunkPublicKey}`,
          },
          body: JSON.stringify({ email, event: plunkEvent, data }),
        },
        PLUNK_TIMEOUT_MS
      );
      if (!res.ok) {
        console.error("[plunk:cal-booked] /track error:", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.error("[plunk:cal-booked] /track error:", err);
    }
  }
}

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

    markCallBookedInPlunk(email.trim().toLowerCase(), firstName.trim()).catch(
      (err) => console.error("[plunk:cal-booked] failed:", err),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Booking notification error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
