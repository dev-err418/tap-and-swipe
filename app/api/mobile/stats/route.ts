import { NextResponse } from "next/server";

// ── Auth ────────────────────────────────────────────────────────────────
function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.MOBILE_API_KEY;
}

// ── Helpers ─────────────────────────────────────────────────────────────
interface Metric {
  value: number;
  change: number | null;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ── Whop MRR ────────────────────────────────────────────────────────────
async function fetchWhopMrr(apiKey: string): Promise<number> {
  const planPrices = new Map<string, number>();

  let planPage = 1;
  let hasMorePlans = true;
  while (hasMorePlans) {
    const res = await fetch(
      `https://api.whop.com/api/v2/plans?per_page=50&page=${planPage}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) throw new Error(`Whop plans API: ${res.status}`);
    const body = await res.json();
    const plans = body.data ?? body;

    for (const plan of Array.isArray(plans) ? plans : []) {
      const id = plan.id as string;
      const renewalAmount = Number(plan.renewal_price ?? plan.initial_price ?? 0);
      const billingPeriod = Number(plan.billing_period ?? 30);
      const monthly = billingPeriod > 0 ? (renewalAmount / billingPeriod) * 30 : 0;
      planPrices.set(id, monthly);
    }

    const pagination = body.pagination;
    hasMorePlans =
      pagination && pagination.current_page < pagination.total_page;
    planPage++;
  }

  let mrr = 0;
  let memberPage = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(
      `https://api.whop.com/api/v2/memberships?valid=true&per_page=50&page=${memberPage}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) throw new Error(`Whop memberships API: ${res.status}`);
    const body = await res.json();
    const memberships = body.data ?? body;

    for (const m of Array.isArray(memberships) ? memberships : []) {
      const planId = m.plan as string;
      mrr += planPrices.get(planId) ?? 0;
    }

    const pagination = body.pagination;
    hasMore =
      pagination && pagination.current_page < pagination.total_page;
    memberPage++;
  }

  return Math.round(mrr * 100) / 100;
}

// ── Listmonk subscribers ────────────────────────────────────────────────
async function fetchSubscriberCount(): Promise<number> {
  const url = process.env.LISTMONK_URL;
  const user = process.env.LISTMONK_API_USER;
  const pass = process.env.LISTMONK_API_PASSWORD;
  const listUuid = process.env.LISTMONK_LIST_UUID;

  if (!url || !user || !pass || !listUuid) {
    throw new Error("Missing Listmonk env vars");
  }

  const res = await fetch(`${url}/api/lists`, {
    headers: {
      Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
    },
  });
  if (!res.ok) throw new Error(`Listmonk API: ${res.status}`);
  const body = await res.json();
  const lists = body.data?.results ?? [];

  const list = lists.find(
    (l: { uuid: string }) => l.uuid === listUuid
  );
  return list?.subscriber_count ?? 0;
}

// ── PostHog helpers ─────────────────────────────────────────────────────
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY!;

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

async function fetchWebTraffic(): Promise<Metric> {
  const current7 = dateStr(7);
  const current1 = dateStr(1);
  const prev14 = dateStr(14);
  const prev8 = dateStr(8);

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

interface NewsletterStats {
  topCountries: string[];
  conversions: Metric;
  cr: number;
  topReferrers: string[];
  topPages: string[];
}

async function fetchNewsletterStats(): Promise<NewsletterStats> {
  const current7 = dateStr(7);
  const current1 = dateStr(1);
  const prev14 = dateStr(14);

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
    LIMIT 3
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
    LIMIT 3
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
    LIMIT 3
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

  const [asoResult, commuResult, subsResult, trafficResult, newsletterResult] =
    await Promise.allSettled([
      fetchWhopMrr(process.env.WHOP_ASO_API_KEY!),
      fetchWhopMrr(process.env.WHOP_COMMUNITY_API_KEY!),
      fetchSubscriberCount(),
      fetchWebTraffic(),
      fetchNewsletterStats(),
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
