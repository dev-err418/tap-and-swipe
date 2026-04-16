import { NextRequest, NextResponse } from "next/server";
import { fetchWhopMrr } from "@/lib/stats-helpers";
import { sendPush } from "@/lib/apns";
import { stripe } from "@/lib/stripe";

// ── PostHog query helper ────────────────────────────────────────────────
const PH_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

async function posthogQuery(query: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${PH_HOST}/api/projects/@current/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog query API: ${res.status} ${text}`);
  }
  return res.json();
}

// ── Today's new subscribers (PostHog) ───────────────────────────────────
async function fetchTodayNewSubs(): Promise<number> {
  const result = (await posthogQuery(`
    SELECT count()
    FROM events
    WHERE event = 'newsletter_subscribe'
      AND toDate(timestamp) = today()
  `)) as { results?: unknown[][] };

  return Number(result.results?.[0]?.[0] ?? 0);
}

// ── Today's revenue (Stripe charges) ────────────────────────────────────
async function fetchTodayRevenue(): Promise<number> {
  // Start of today in CEST (UTC+2)
  const now = new Date();
  const cestOffset = 2 * 60 * 60 * 1000;
  const cestNow = new Date(now.getTime() + cestOffset);
  const startOfDayCEST = new Date(
    Date.UTC(cestNow.getUTCFullYear(), cestNow.getUTCMonth(), cestNow.getUTCDate())
  );
  // Convert back to UTC timestamp
  const startUtc = Math.floor(
    (startOfDayCEST.getTime() - cestOffset) / 1000
  );

  let total = 0;
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: Record<string, unknown> = {
      created: { gte: startUtc },
      limit: 100,
    };
    if (startingAfter) params.starting_after = startingAfter;

    const charges = await stripe.charges.list(
      params as Parameters<typeof stripe.charges.list>[0]
    );

    for (const charge of charges.data) {
      if (charge.status === "succeeded" && !charge.refunded) {
        total += charge.amount;
      }
    }

    hasMore = charges.has_more;
    if (charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id;
    }
  }

  // Stripe amounts are in cents
  return Math.round(total) / 100;
}

// ── Format helpers ──────────────────────────────────────────────────────
function fmtDollars(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtRevenue(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Route handler ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const secret = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];

  // Fetch all data in parallel, tolerating individual failures
  const [asoResult, commuResult, subsResult, revenueResult] =
    await Promise.allSettled([
      fetchWhopMrr(process.env.WHOP_ASO_API_KEY!),
      fetchWhopMrr(process.env.WHOP_COMMUNITY_API_KEY!),
      fetchTodayNewSubs(),
      fetchTodayRevenue(),
    ]);

  const asoMrr = asoResult.status === "fulfilled" ? asoResult.value : 0;
  const commuMrr = commuResult.status === "fulfilled" ? commuResult.value : 0;
  const todaySubs = subsResult.status === "fulfilled" ? subsResult.value : 0;
  const todayRevenue = revenueResult.status === "fulfilled" ? revenueResult.value : 0;

  for (const [name, result] of [
    ["asoMrr", asoResult],
    ["commuMrr", commuResult],
    ["todaySubs", subsResult],
    ["todayRevenue", revenueResult],
  ] as const) {
    if (result.status === "rejected") {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${name}: ${msg}`);
      console.error(`[daily-stats] ${name} failed:`, result.reason);
    }
  }

  const totalMrr = Math.round(asoMrr + commuMrr);

  // Debug: log APNS config
  console.log(`[daily-stats] APNS host=${process.env.APNS_SANDBOX === "true" ? "sandbox" : "production"} token=${process.env.APNS_DEVICE_TOKEN?.slice(0, 8)}... bundle=${process.env.APP_BUNDLE_ID}`);

  // Send push notifications (these can still fail the route)
  try {
    await sendPush(
      "\u{1F4B0} MRR Update",
      `ASO: ${fmtDollars(Math.round(asoMrr))} · Community: ${fmtDollars(Math.round(commuMrr))} · Total: ${fmtDollars(totalMrr)}`
    );

    await sendPush(
      "\u{1F4C8} Today's Stats",
      `+${todaySubs} subs · ${fmtRevenue(todayRevenue)} revenue`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`push: ${message}`);
    console.error("[daily-stats] Push failed:", err);
  }

  console.log(
    `[daily-stats] MRR: ASO=${asoMrr} Community=${commuMrr} | Subs=${todaySubs} Revenue=${todayRevenue}`
  );

  return NextResponse.json({
    asoMrr,
    commuMrr,
    totalMrr,
    todaySubs,
    todayRevenue,
    ...(errors.length > 0 ? { errors } : {}),
    _debug: {
      apnsHost: process.env.APNS_SANDBOX === "true" ? "sandbox" : "production",
      tokenPrefix: process.env.APNS_DEVICE_TOKEN?.slice(0, 8),
      bundleId: process.env.APP_BUNDLE_ID,
    },
  });
}
