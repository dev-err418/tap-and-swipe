import { NextResponse } from "next/server";
import {
  pctChange,
  dateStr,
  fetchWhopMrr,
  fetchSubscriberCount,
} from "@/lib/stats-helpers";

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

interface NewsletterStats {
  topCountries: string[];
  conversions: Metric;
  cr: number;
  topReferrers: string[];
  topPages: string[];
}

// ── PostHog helpers ─────────────────────────────────────────────────────
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

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

async function fetchWebTraffic(days: number): Promise<Metric> {
  const current7 = dateStr(days);
  const current1 = dateStr(1);
  const prev14 = dateStr(days * 2);

  const result = (await posthogQuery(`
    SELECT
      if(timestamp >= toDate('${current7}') AND timestamp <= toDate('${current1}'), 'current', 'previous') AS period,
      count(DISTINCT "$session_id") AS sessions
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDate('${prev14}')
      AND timestamp <= toDate('${current1}')
    GROUP BY period
  `)) as { results?: unknown[][] };

  let current = 0;
  let previous = 0;
  for (const row of result.results ?? []) {
    if (row[0] === "current") current = Number(row[1]);
    else if (row[0] === "previous") previous = Number(row[1]);
  }

  return { value: current, change: pctChange(current, previous) };
}

async function fetchNewsletterStats(days: number): Promise<NewsletterStats> {
  const current7 = dateStr(days);
  const current1 = dateStr(1);
  const prev14 = dateStr(days * 2);

  // Top countries from newsletter_subscribe events
  const countriesResult = (await posthogQuery(`
    SELECT properties.$geoip_country_code AS country, count() AS cnt
    FROM events
    WHERE event = 'newsletter_subscribe'
      AND timestamp >= toDate('${current7}')
      AND timestamp <= toDate('${current1}')
      AND country IS NOT NULL AND country != ''
    GROUP BY country
    ORDER BY cnt DESC
    LIMIT 5
  `)) as { results?: unknown[][] };

  const topCountries = (countriesResult.results ?? []).map(
    (row) => String(row[0])
  );

  // Homepage visits for CR calculation
  const visitsResult = (await posthogQuery(`
    SELECT count() AS views
    FROM events
    WHERE event = '$pageview'
      AND properties.$pathname = '/'
      AND timestamp >= toDate('${current7}')
      AND timestamp <= toDate('${current1}')
  `)) as { results?: unknown[][] };

  const visits = Number(visitsResult.results?.[0]?.[0] ?? 0);

  // Newsletter subscribe events (current vs previous week)
  const convResult = (await posthogQuery(`
    SELECT
      if(timestamp >= toDate('${current7}') AND timestamp <= toDate('${current1}'), 'current', 'previous') AS period,
      count() AS cnt
    FROM events
    WHERE event = 'newsletter_subscribe'
      AND timestamp >= toDate('${prev14}')
      AND timestamp <= toDate('${current1}')
    GROUP BY period
  `)) as { results?: unknown[][] };

  let convCurrent = 0;
  let convPrevious = 0;
  for (const row of convResult.results ?? []) {
    if (row[0] === "current") convCurrent = Number(row[1]);
    else if (row[0] === "previous") convPrevious = Number(row[1]);
  }

  const cr = visits > 0
    ? Math.round((convCurrent / visits) * 1000) / 10
    : 0;

  // Top referrers (last 7 days)
  const referrersResult = (await posthogQuery(`
    SELECT properties.$referring_domain AS referrer, count() AS cnt
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDate('${current7}')
      AND timestamp <= toDate('${current1}')
      AND referrer IS NOT NULL AND referrer != '' AND referrer != '$direct'
    GROUP BY referrer
    ORDER BY cnt DESC
    LIMIT 5
  `)) as { results?: unknown[][] };

  const topReferrers = (referrersResult.results ?? []).map(
    (row) => String(row[0])
  );

  // Top pages (last 7 days)
  const pagesResult = (await posthogQuery(`
    SELECT properties.$pathname AS page, count() AS cnt
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDate('${current7}')
      AND timestamp <= toDate('${current1}')
      AND page IS NOT NULL AND page != ''
    GROUP BY page
    ORDER BY cnt DESC
    LIMIT 5
  `)) as { results?: unknown[][] };

  const topPages = (pagesResult.results ?? []).map(
    (row) => String(row[0])
  );

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
