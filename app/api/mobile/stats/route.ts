import { NextResponse } from "next/server";
import {
  pctChange,
  fetchWhopMrr,
  fetchSubscriberCount,
  daysAgo,
  countryFlag,
  countryLabel,
  REFERRER_NAMES,
  PRODUCT_LABELS,
} from "@/lib/stats-helpers";
import { prisma } from "@/lib/prisma";

// ── Auth ────────────────────────────────────────────────────────────────
function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.MOBILE_API_KEY;
}

// ── Types ───────────────────────────────────────────────────────────────
interface Metric {
  value: number;
  change: number | null;
}

interface RankedItem {
  label: string;
  count: number;
}

interface NewsletterStats {
  topCountries: RankedItem[];
  conversions: Metric;
  cr: number;
  topReferrers: RankedItem[];
  topPages: RankedItem[];
}

// ── PageEvent-based helpers ─────────────────────────────────────────────

async function fetchWebTraffic(days: number): Promise<Metric> {
  const currentStart = daysAgo(days);
  const previousStart = daysAgo(days * 2);

  const [currentRow, previousRow] = await Promise.all([
    prisma.$queryRaw<[{ sessions: bigint }]>`
      SELECT COUNT(DISTINCT "sessionId")::bigint as sessions
      FROM "PageEvent"
      WHERE type = 'page_view' AND "createdAt" >= ${currentStart}
    `,
    prisma.$queryRaw<[{ sessions: bigint }]>`
      SELECT COUNT(DISTINCT "sessionId")::bigint as sessions
      FROM "PageEvent"
      WHERE type = 'page_view'
        AND "createdAt" >= ${previousStart}
        AND "createdAt" < ${currentStart}
    `,
  ]);

  const current = Number(currentRow[0]?.sessions ?? 0);
  const previous = Number(previousRow[0]?.sessions ?? 0);
  return { value: current, change: pctChange(current, previous) };
}

async function fetchNewsletterStats(days: number): Promise<NewsletterStats> {
  const currentStart = daysAgo(days);
  const previousStart = daysAgo(days * 2);

  const [
    countriesRows,
    visitsRow,
    currentSubsRow,
    previousSubsRow,
    referrersRows,
    productRows,
  ] = await Promise.all([
    prisma.$queryRaw<{ country: string | null; cnt: bigint }[]>`
      SELECT country, COUNT(*)::bigint as cnt
      FROM "PageEvent"
      WHERE product = 'home'
        AND type = 'page_view'
        AND "createdAt" >= ${currentStart}
        AND country IS NOT NULL
      GROUP BY country
      ORDER BY cnt DESC
      LIMIT 3
    `,
    prisma.$queryRaw<[{ views: bigint }]>`
      SELECT COUNT(*)::bigint as views
      FROM "PageEvent"
      WHERE product = 'home'
        AND type = 'page_view'
        AND "createdAt" >= ${currentStart}
    `,
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint as cnt
      FROM "PageEvent"
      WHERE product = 'home'
        AND type = 'subscribe'
        AND "createdAt" >= ${currentStart}
    `,
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint as cnt
      FROM "PageEvent"
      WHERE product = 'home'
        AND type = 'subscribe'
        AND "createdAt" >= ${previousStart}
        AND "createdAt" < ${currentStart}
    `,
    prisma.$queryRaw<{ referrer: string | null; cnt: bigint }[]>`
      SELECT referrer, COUNT(*)::bigint as cnt
      FROM "PageEvent"
      WHERE type = 'page_view'
        AND "createdAt" >= ${currentStart}
        AND referrer IS NOT NULL
      GROUP BY referrer
      ORDER BY cnt DESC
      LIMIT 20
    `,
    prisma.$queryRaw<{ product: string; cnt: bigint }[]>`
      SELECT product, COUNT(*)::bigint as cnt
      FROM "PageEvent"
      WHERE type = 'page_view'
        AND "createdAt" >= ${currentStart}
      GROUP BY product
      ORDER BY cnt DESC
      LIMIT 5
    `,
  ]);

  const topCountries: RankedItem[] = countriesRows
    .filter((r) => r.country)
    .map((r) => {
      const code = r.country!.toUpperCase();
      return {
        label: `${countryFlag(code)} ${countryLabel(code)}`,
        count: Number(r.cnt),
      };
    });

  const visits = Number(visitsRow[0]?.views ?? 0);
  const convCurrent = Number(currentSubsRow[0]?.cnt ?? 0);
  const convPrevious = Number(previousSubsRow[0]?.cnt ?? 0);
  const cr = visits > 0 ? Math.round((convCurrent / visits) * 1000) / 10 : 0;

  const referrerMap = new Map<string, number>();
  for (const row of referrersRows) {
    if (!row.referrer) continue;
    const name = REFERRER_NAMES[row.referrer] ?? row.referrer;
    referrerMap.set(name, (referrerMap.get(name) ?? 0) + Number(row.cnt));
  }
  const topReferrers: RankedItem[] = [...referrerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const topPages: RankedItem[] = productRows.map((r) => ({
    label: PRODUCT_LABELS[r.product] ?? `/${r.product}`,
    count: Number(r.cnt),
  }));

  return {
    topCountries,
    conversions: {
      value: convCurrent,
      change: pctChange(convCurrent, convPrevious),
    },
    cr,
    topReferrers,
    topPages,
  };
}

// ── Route handler ───────────────────────────────────────────────────────
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const daysParam = parseInt(url.searchParams.get("days") ?? "7", 10);
  const days = [1, 3, 7, 30].includes(daysParam) ? daysParam : 7;

  const [asoResult, commuResult, subsResult, trafficResult, newsletterResult] =
    await Promise.allSettled([
      fetchWhopMrr(process.env.WHOP_ASO_API_KEY!),
      fetchWhopMrr(process.env.WHOP_COMMUNITY_API_KEY!),
      fetchSubscriberCount(),
      fetchWebTraffic(7),
      fetchNewsletterStats(days),
    ]);

  const asoMrr =
    asoResult.status === "fulfilled" ? asoResult.value : 0;
  const commuMrr =
    commuResult.status === "fulfilled" ? commuResult.value : 0;
  const subs =
    subsResult.status === "fulfilled" ? subsResult.value : 0;
  const webTraffic: Metric =
    trafficResult.status === "fulfilled"
      ? trafficResult.value
      : { value: 0, change: null };
  const newsletter: NewsletterStats =
    newsletterResult.status === "fulfilled"
      ? newsletterResult.value
      : {
          topCountries: [],
          conversions: { value: 0, change: null },
          cr: 0,
          topReferrers: [],
          topPages: [],
        };

  // Log any errors for debugging
  for (const [name, result] of [
    ["asoMrr", asoResult],
    ["commuMrr", commuResult],
    ["subs", subsResult],
    ["webTraffic", trafficResult],
    ["newsletter", newsletterResult],
  ] as const) {
    if (result.status === "rejected") {
      console.error(`[mobile/stats] ${name} failed:`, result.reason);
    }
  }

  return NextResponse.json({
    asoMrr: { value: asoMrr, change: null },
    commuMrr: { value: commuMrr, change: null },
    subs: { value: subs, change: null },
    webTraffic,
    newsletter,
  });
}
