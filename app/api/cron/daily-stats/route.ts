import { NextRequest, NextResponse } from "next/server";
import { fetchWhopMrr } from "@/lib/stats-helpers";
import { sendPush } from "@/lib/apns";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// ── Today's new subscribers (PageEvent) ─────────────────────────────────
async function fetchTodayNewSubs(): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return prisma.pageEvent.count({
    where: {
      product: "home",
      type: "subscribe",
      createdAt: { gte: startOfToday },
    },
  });
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

// ── Today's new ASO trials (Stripe) ──────────────────────────────────
async function fetchTodayNewTrials(): Promise<number> {
  const now = new Date();
  const cestOffset = 2 * 60 * 60 * 1000;
  const cestNow = new Date(now.getTime() + cestOffset);
  const startOfDayCEST = new Date(
    Date.UTC(cestNow.getUTCFullYear(), cestNow.getUTCMonth(), cestNow.getUTCDate())
  );
  const startUtc = Math.floor(
    (startOfDayCEST.getTime() - cestOffset) / 1000
  );

  let count = 0;
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: Record<string, unknown> = {
      status: "trialing",
      created: { gte: startUtc },
      limit: 100,
    };
    if (startingAfter) params.starting_after = startingAfter;

    const subs = await stripe.subscriptions.list(
      params as Parameters<typeof stripe.subscriptions.list>[0]
    );

    count += subs.data.length;
    hasMore = subs.has_more;
    if (subs.data.length > 0) {
      startingAfter = subs.data[subs.data.length - 1].id;
    }
  }

  return count;
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
  const [asoResult, commuResult, subsResult, revenueResult, trialsResult] =
    await Promise.allSettled([
      fetchWhopMrr(process.env.WHOP_ASO_API_KEY!),
      fetchWhopMrr(process.env.WHOP_COMMUNITY_API_KEY!),
      fetchTodayNewSubs(),
      fetchTodayRevenue(),
      fetchTodayNewTrials(),
    ]);

  const asoMrr = asoResult.status === "fulfilled" ? asoResult.value : 0;
  const commuMrr = commuResult.status === "fulfilled" ? commuResult.value : 0;
  const todaySubs = subsResult.status === "fulfilled" ? subsResult.value : 0;
  const todayRevenue = revenueResult.status === "fulfilled" ? revenueResult.value : 0;
  const todayTrials = trialsResult.status === "fulfilled" ? trialsResult.value : 0;

  for (const [name, result] of [
    ["asoMrr", asoResult],
    ["commuMrr", commuResult],
    ["todaySubs", subsResult],
    ["todayRevenue", revenueResult],
    ["todayTrials", trialsResult],
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
      `ASO ${fmtDollars(Math.round(asoMrr))} + Community ${fmtDollars(Math.round(commuMrr))}\nTotal: ${fmtDollars(totalMrr)}`
    );

    await sendPush(
      "\u{1F4C8} Today's Stats",
      `+${todaySubs} subs · ${todayTrials} trials · ${fmtRevenue(todayRevenue)} revenue`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`push: ${message}`);
    console.error("[daily-stats] Push failed:", err);
  }

  console.log(
    `[daily-stats] MRR: ASO=${asoMrr} Community=${commuMrr} | Subs=${todaySubs} Trials=${todayTrials} Revenue=${todayRevenue}`
  );

  return NextResponse.json({
    asoMrr,
    commuMrr,
    totalMrr,
    todaySubs,
    todayTrials,
    todayRevenue,
    ...(errors.length > 0 ? { errors } : {}),
    _debug: {
      apnsHost: process.env.APNS_SANDBOX === "true" ? "sandbox" : "production",
      tokenPrefix: process.env.APNS_DEVICE_TOKEN?.slice(0, 8),
      bundleId: process.env.APP_BUNDLE_ID,
    },
  });
}
