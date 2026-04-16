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

// ── PostHog helpers ─────────────────────────────────────────────────────
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

async function posthogQuery(query: string): Promise<Record<string, unknown>> {
  // Add unique comment to bust PostHog's query cache
  const bustQuery = `/* ${Date.now()} */ ${query}`;
  const res = await fetch(`${PH_HOST}/api/projects/@current/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query: bustQuery } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog query API: ${res.status} ${text}`);
  }
  return res.json();
}

async function fetchWebTraffic(days: number): Promise<Metric> {
  const currentStart = dateStr(days);
  const prevStart = dateStr(days * 2);

  const result = (await posthogQuery(`
    SELECT
      if(timestamp >= toDate('${currentStart}'), 'current', 'previous') AS period,
      count(DISTINCT "$session_id") AS sessions
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDate('${prevStart}')
      AND timestamp <= now()
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
  const currentStart = dateStr(days);
  const prevStart = dateStr(days * 2);

  // Top countries from pageview events
  const countriesResult = (await posthogQuery(`
    SELECT properties.$geoip_country_code AS country, count() AS cnt
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDate('${currentStart}')
      AND timestamp <= now()
      AND country IS NOT NULL AND country != ''
    GROUP BY country
    ORDER BY cnt DESC
    LIMIT 3
  `)) as { results?: unknown[][] };

  const topCountries: RankedItem[] = (countriesResult.results ?? []).map(
    (row) => ({ label: String(row[0]), count: Number(row[1]) })
  );

  // Homepage visits for CR calculation
  const visitsResult = (await posthogQuery(`
    SELECT count() AS views
    FROM events
    WHERE event = '$pageview'
      AND properties.$pathname = '/'
      AND timestamp >= toDate('${currentStart}')
      AND timestamp <= now()
  `)) as { results?: unknown[][] };

  const visits = Number(visitsResult.results?.[0]?.[0] ?? 0);

  // Newsletter subscribe events (current vs previous period)
  const convResult = (await posthogQuery(`
    SELECT
      if(timestamp >= toDate('${currentStart}'), 'current', 'previous') AS period,
      count() AS cnt
    FROM events
    WHERE event = 'newsletter_subscribe'
      AND timestamp >= toDate('${prevStart}')
      AND timestamp <= now()
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

  // Top referrers
  const referrersResult = (await posthogQuery(`
    SELECT properties.$referring_domain AS referrer, count() AS cnt
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDate('${currentStart}')
      AND timestamp <= now()
      AND referrer IS NOT NULL AND referrer != '' AND referrer != '$direct'
    GROUP BY referrer
    ORDER BY cnt DESC
    LIMIT 5
  `)) as { results?: unknown[][] };

  const referrerNames: Record<string, string> = {
    "www.youtube.com": "YouTube",
    "youtube.com": "YouTube",
    "m.youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "www.google.com": "Google",
    "google.com": "Google",
    "t.co": "X/Twitter",
    "www.reddit.com": "Reddit",
    "www.facebook.com": "Facebook",
    "www.instagram.com": "Instagram",
    "www.tiktok.com": "TikTok",
    "www.linkedin.com": "LinkedIn",
    "tap-and-swipe.com": "t&s.com",
    "www.tap-and-swipe.com": "t&s.com",
  };

  // Merge referrer variants (e.g. www.youtube.com + m.youtube.com → YouTube)
  const referrerMap = new Map<string, number>();
  for (const row of referrersResult.results ?? []) {
    const domain = String(row[0]);
    const name = referrerNames[domain] ?? domain;
    referrerMap.set(name, (referrerMap.get(name) ?? 0) + Number(row[1]));
  }
  const topReferrers: RankedItem[] = [...referrerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  // Top pages
  const pagesResult = (await posthogQuery(`
    SELECT properties.$pathname AS page, count() AS cnt
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDate('${currentStart}')
      AND timestamp <= now()
      AND page IS NOT NULL AND page != ''
    GROUP BY page
    ORDER BY cnt DESC
    LIMIT 5
  `)) as { results?: unknown[][] };

  const pageNames: Record<string, string> = {
    "/app-sprint-community": "/community",
  };

  const topPages: RankedItem[] = (pagesResult.results ?? []).map(
    (row) => ({ label: pageNames[String(row[0])] ?? String(row[0]), count: Number(row[1]) })
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
