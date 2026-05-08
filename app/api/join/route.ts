import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

// Upserts the contact in Plunk with humanized lead data, then fires the
// PLUNK_HIGH_TICKET_EVENT workflow. The 1h and 24h follow-up emails are
// configured as steps inside that workflow on the Plunk dashboard.
async function triggerHighTicketWorkflow(input: {
  email: string;
  firstName: string;
  country: string | null;
  budget: string | undefined;
  revenue: string | undefined;
  hasApp: string;
  challenge: string | undefined;
  ref: string | undefined;
}) {
  const plunkUrl = process.env.PLUNK_API_URL;
  const plunkSecretKey = process.env.PLUNK_API_KEY;
  const plunkPublicKey = process.env.PLUNK_PUBLIC_KEY;
  const plunkEvent = process.env.PLUNK_HIGH_TICKET_EVENT;
  if (!plunkUrl || !plunkPublicKey || !plunkEvent) {
    console.error("[plunk:high-ticket] missing env vars (PLUNK_API_URL / PLUNK_PUBLIC_KEY / PLUNK_HIGH_TICKET_EVENT)");
    return;
  }

  // calBooked starts "false" so the Plunk workflow can gate each email
  // step on data.calBooked == "false". /api/join/booked flips it to "true".
  const data: Record<string, string> = {
    firstName: input.firstName,
    calBooked: "false",
  };
  if (input.country) data.country = input.country;
  if (input.budget) data.budget = BUDGET_LABEL[input.budget] ?? input.budget;
  if (input.revenue) data.mrr = REVENUE_LABEL[input.revenue] ?? input.revenue;
  if (input.hasApp) data.hasApp = HAS_APP_LABEL[input.hasApp] ?? input.hasApp;
  if (input.challenge) data.challenge = input.challenge;
  if (input.ref) data.ref = input.ref;

  if (plunkSecretKey) {
    try {
      const res = await fetchWithTimeout(
        `${plunkUrl}/contacts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${plunkSecretKey}`,
          },
          body: JSON.stringify({ email: input.email, data }),
        },
        PLUNK_TIMEOUT_MS
      );
      if (!res.ok) {
        console.error("[plunk:high-ticket] /contacts error:", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.error("[plunk:high-ticket] /contacts error:", err);
    }
  }

  try {
    const res = await fetchWithTimeout(
      `${plunkUrl}/v1/track`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${plunkPublicKey}`,
        },
        body: JSON.stringify({
          email: input.email,
          event: plunkEvent,
          data,
        }),
      },
      PLUNK_TIMEOUT_MS
    );
    if (!res.ok) {
      console.error("[plunk:high-ticket] /track error:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[plunk:high-ticket] /track error:", err);
  }
}

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

      triggerHighTicketWorkflow({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        country,
        budget,
        revenue,
        hasApp,
        challenge: challenge?.trim() || undefined,
        ref: ref || undefined,
      }).catch((err) => console.error("[plunk:high-ticket] workflow trigger failed:", err));
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
