import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Period = "day" | "week" | "month" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
  all: "All time",
};

function getDateFilter(period: Period) {
  if (period === "all") return undefined;
  const now = new Date();
  if (period === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", FR: "France", DE: "Germany",
  CA: "Canada", AU: "Australia", ES: "Spain", IT: "Italy", NL: "Netherlands",
  BE: "Belgium", CH: "Switzerland", AT: "Austria", SE: "Sweden", NO: "Norway",
  DK: "Denmark", FI: "Finland", IE: "Ireland", PT: "Portugal", PL: "Poland",
  BR: "Brazil", MX: "Mexico", AR: "Argentina", CL: "Chile", CO: "Colombia",
  JP: "Japan", KR: "South Korea", SG: "Singapore", HK: "Hong Kong", TW: "Taiwan",
  IN: "India", PK: "Pakistan", BD: "Bangladesh", NP: "Nepal", LK: "Sri Lanka",
  NZ: "New Zealand", IL: "Israel", AE: "United Arab Emirates", SA: "Saudi Arabia",
  TR: "Turkey", RU: "Russia", UA: "Ukraine", ZA: "South Africa", EG: "Egypt",
  NG: "Nigeria", KE: "Kenya", MA: "Morocco",
};

function countryFlag(code: string) {
  if (code.length !== 2) return "";
  const base = 0x1f1e6;
  const a = code.toUpperCase().charCodeAt(0) - 65;
  const b = code.toUpperCase().charCodeAt(1) - 65;
  if (a < 0 || a > 25 || b < 0 || b > 25) return "";
  return String.fromCodePoint(base + a) + String.fromCodePoint(base + b);
}

function countryLabel(code: string | null) {
  if (!code) return "Unknown";
  const flag = countryFlag(code);
  const name = COUNTRY_NAMES[code] ? `${COUNTRY_NAMES[code]} (${code})` : code;
  return flag ? `${flag} ${name}` : name;
}

type Group = { key: string; label: string; faviconDomain: string };

const REFERRER_GROUPS: Record<string, Group> = {
  "youtube.com": { key: "youtube", label: "YouTube", faviconDomain: "youtube.com" },
  "m.youtube.com": { key: "youtube", label: "YouTube", faviconDomain: "youtube.com" },
  "www.youtube.com": { key: "youtube", label: "YouTube", faviconDomain: "youtube.com" },
  "youtu.be": { key: "youtube", label: "YouTube", faviconDomain: "youtube.com" },
  "google.com": { key: "google", label: "Google", faviconDomain: "google.com" },
  "www.google.com": { key: "google", label: "Google", faviconDomain: "google.com" },
  "news.google.com": { key: "google", label: "Google", faviconDomain: "google.com" },
  "gemini.google.com": { key: "gemini", label: "Gemini", faviconDomain: "gemini.google.com" },
  "bing.com": { key: "bing", label: "Bing", faviconDomain: "bing.com" },
  "www.bing.com": { key: "bing", label: "Bing", faviconDomain: "bing.com" },
  "duckduckgo.com": { key: "duckduckgo", label: "DuckDuckGo", faviconDomain: "duckduckgo.com" },
  "search.brave.com": { key: "brave", label: "Brave", faviconDomain: "brave.com" },
  "chatgpt.com": { key: "chatgpt", label: "ChatGPT", faviconDomain: "chatgpt.com" },
  "chat.openai.com": { key: "chatgpt", label: "ChatGPT", faviconDomain: "chatgpt.com" },
  "perplexity.ai": { key: "perplexity", label: "Perplexity", faviconDomain: "perplexity.ai" },
  "www.perplexity.ai": { key: "perplexity", label: "Perplexity", faviconDomain: "perplexity.ai" },
  "linkedin.com": { key: "linkedin", label: "LinkedIn", faviconDomain: "linkedin.com" },
  "www.linkedin.com": { key: "linkedin", label: "LinkedIn", faviconDomain: "linkedin.com" },
  "lnkd.in": { key: "linkedin", label: "LinkedIn", faviconDomain: "linkedin.com" },
  "twitter.com": { key: "x", label: "X (Twitter)", faviconDomain: "x.com" },
  "x.com": { key: "x", label: "X (Twitter)", faviconDomain: "x.com" },
  "t.co": { key: "x", label: "X (Twitter)", faviconDomain: "x.com" },
  "facebook.com": { key: "facebook", label: "Facebook", faviconDomain: "facebook.com" },
  "m.facebook.com": { key: "facebook", label: "Facebook", faviconDomain: "facebook.com" },
  "l.facebook.com": { key: "facebook", label: "Facebook", faviconDomain: "facebook.com" },
  "lm.facebook.com": { key: "facebook", label: "Facebook", faviconDomain: "facebook.com" },
  "www.facebook.com": { key: "facebook", label: "Facebook", faviconDomain: "facebook.com" },
  "instagram.com": { key: "instagram", label: "Instagram", faviconDomain: "instagram.com" },
  "www.instagram.com": { key: "instagram", label: "Instagram", faviconDomain: "instagram.com" },
  "l.instagram.com": { key: "instagram", label: "Instagram", faviconDomain: "instagram.com" },
  "threads.net": { key: "threads", label: "Threads", faviconDomain: "threads.net" },
  "www.threads.net": { key: "threads", label: "Threads", faviconDomain: "threads.net" },
  "discord.com": { key: "discord", label: "Discord", faviconDomain: "discord.com" },
  "discord.gg": { key: "discord", label: "Discord", faviconDomain: "discord.com" },
  "reddit.com": { key: "reddit", label: "Reddit", faviconDomain: "reddit.com" },
  "www.reddit.com": { key: "reddit", label: "Reddit", faviconDomain: "reddit.com" },
  "old.reddit.com": { key: "reddit", label: "Reddit", faviconDomain: "reddit.com" },
  "out.reddit.com": { key: "reddit", label: "Reddit", faviconDomain: "reddit.com" },
  "tiktok.com": { key: "tiktok", label: "TikTok", faviconDomain: "tiktok.com" },
  "www.tiktok.com": { key: "tiktok", label: "TikTok", faviconDomain: "tiktok.com" },
  "vm.tiktok.com": { key: "tiktok", label: "TikTok", faviconDomain: "tiktok.com" },
  "github.com": { key: "github", label: "GitHub", faviconDomain: "github.com" },
  "www.github.com": { key: "github", label: "GitHub", faviconDomain: "github.com" },
  "news.ycombinator.com": { key: "hn", label: "Hacker News", faviconDomain: "news.ycombinator.com" },
  "apps.apple.com": { key: "apple", label: "App Store", faviconDomain: "apple.com" },
  "whop.com": { key: "whop", label: "Whop", faviconDomain: "whop.com" },
  "stripe.com": { key: "stripe", label: "Stripe", faviconDomain: "stripe.com" },
  "checkout.stripe.com": { key: "stripe", label: "Stripe", faviconDomain: "stripe.com" },
  "billing.stripe.com": { key: "stripe", label: "Stripe", faviconDomain: "stripe.com" },
  "webmii.com": { key: "webmii", label: "Webmii", faviconDomain: "webmii.com" },
  "www.webmii.com": { key: "webmii", label: "Webmii", faviconDomain: "webmii.com" },
};

function Favicon({ domain, size = 16 }: { domain: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={size}
      height={size}
      className="inline-block rounded-[3px]"
      loading="lazy"
    />
  );
}

type DisplayRow = { label: string; icon: ReactNode; count: number };

function groupReferrers(rows: { key: string | null; count: number }[]): DisplayRow[] {
  const groups = new Map<string, { label: string; icon: ReactNode; count: number }>();

  for (const row of rows) {
    let label: string;
    let icon: ReactNode = null;
    let sortKey: string;

    if (!row.key) {
      label = "Direct";
      sortKey = "__direct__";
    } else {
      const domain = row.key.toLowerCase();
      const group = REFERRER_GROUPS[domain];
      if (group) {
        label = group.label;
        sortKey = group.key;
        icon = <Favicon domain={group.faviconDomain} />;
      } else {
        label = row.key;
        sortKey = `_${row.key}`;
        icon = <Favicon domain={row.key} />;
      }
    }

    const existing = groups.get(sortKey);
    if (existing) {
      existing.count += row.count;
    } else {
      groups.set(sortKey, { label, icon, count: row.count });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count)
    .map(({ label, icon, count }) => ({ label, icon, count }));
}

async function fetchQuizFunnel(since: Date) {
  const [row] = await prisma.$queryRaw<[{
    views: bigint; starts: bigint; completes: bigint;
  }]>`
    SELECT
      (SELECT COUNT(*)::bigint FROM "PageEvent" WHERE product='quiz' AND type='page_view' AND "createdAt" >= ${since}) as views,
      (SELECT COUNT(*)::bigint FROM "PageEvent" WHERE product='quiz' AND type='quiz_start' AND "createdAt" >= ${since}) as starts,
      (SELECT COUNT(*)::bigint FROM "PageEvent" WHERE product='quiz' AND type='quiz_complete' AND "createdAt" >= ${since}) as completes
  `;

  let coaching: number | null = null;
  let community: number | null = null;
  try {
    const [split] = await prisma.$queryRaw<[{ coaching: bigint; community: bigint }]>`
      SELECT
        (SELECT COUNT(*)::bigint FROM "PageEvent" WHERE product='quiz' AND type='quiz_complete' AND ref LIKE '%quiz->coaching' AND "createdAt" >= ${since}) as coaching,
        (SELECT COUNT(*)::bigint FROM "PageEvent" WHERE product='quiz' AND type='quiz_complete' AND ref LIKE '%quiz->community' AND "createdAt" >= ${since}) as community
    `;
    coaching = Number(split?.coaching ?? 0);
    community = Number(split?.community ?? 0);
  } catch {
    // ref column not migrated yet; split unavailable
  }

  return {
    views: Number(row?.views ?? 0),
    starts: Number(row?.starts ?? 0),
    completes: Number(row?.completes ?? 0),
    coaching,
    community,
  };
}

async function fetchPaidBreakdowns(product: string, since: Date) {
  const [byReferrer, byCountry, totalRow] = await Promise.all([
    prisma.$queryRaw<{ referrer: string | null; count: bigint }[]>`
      SELECT pv.referrer as referrer, COUNT(DISTINCT u."id")::bigint as count
      FROM "User" u
      INNER JOIN "PageEvent" pv
        ON pv."visitorId" = u."visitorId"
        AND pv.product = ${product}
        AND pv.type = 'page_view'
      WHERE u."paymentProvider" IS NOT NULL
        AND u."visitorId" IS NOT NULL
        AND u."createdAt" >= ${since}
      GROUP BY pv.referrer
      ORDER BY count DESC
    `,
    prisma.$queryRaw<{ country: string | null; count: bigint }[]>`
      SELECT pv.country as country, COUNT(DISTINCT u."id")::bigint as count
      FROM "User" u
      INNER JOIN "PageEvent" pv
        ON pv."visitorId" = u."visitorId"
        AND pv.product = ${product}
        AND pv.type = 'page_view'
      WHERE u."paymentProvider" IS NOT NULL
        AND u."visitorId" IS NOT NULL
        AND u."createdAt" >= ${since}
      GROUP BY pv.country
      ORDER BY count DESC
    `,
    prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(DISTINCT u."id")::bigint as total
      FROM "User" u
      WHERE u."paymentProvider" IS NOT NULL
        AND u."createdAt" >= ${since}
        AND EXISTS (
          SELECT 1 FROM "PageEvent" pv
          WHERE pv."visitorId" = u."visitorId"
            AND pv.product = ${product}
            AND pv.type = 'page_view'
        )
    `,
  ]);

  const referrerRows = byReferrer.map((r) => ({ key: r.referrer, count: Number(r.count) }));
  const countryRows = byCountry.map((r) => ({
    label: countryLabel(r.country),
    icon: null as ReactNode,
    count: Number(r.count),
  }));

  return {
    total: Number(totalRow[0]?.total ?? 0),
    referrers: groupReferrers(referrerRows),
    countries: countryRows,
  };
}

async function fetchBreakdowns(product: string, since: Date) {
  const [byReferrer, byCountry, totalRow, visitorsRow] = await Promise.all([
    prisma.$queryRaw<{ referrer: string | null; count: bigint }[]>`
      SELECT referrer, COUNT(*)::bigint as count
      FROM "PageEvent"
      WHERE product = ${product} AND "createdAt" >= ${since}
      GROUP BY referrer
      ORDER BY count DESC
    `,
    prisma.$queryRaw<{ country: string | null; count: bigint }[]>`
      SELECT country, COUNT(*)::bigint as count
      FROM "PageEvent"
      WHERE product = ${product} AND "createdAt" >= ${since}
      GROUP BY country
      ORDER BY count DESC
    `,
    prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(*)::bigint as total
      FROM "PageEvent"
      WHERE product = ${product} AND "createdAt" >= ${since}
    `,
    prisma.$queryRaw<[{ visitors: bigint }]>`
      SELECT COUNT(DISTINCT "visitorId")::bigint as visitors
      FROM "PageEvent"
      WHERE product = ${product} AND type = 'page_view' AND "createdAt" >= ${since}
    `,
  ]);

  const referrerRows = byReferrer.map((r) => ({ key: r.referrer, count: Number(r.count) }));
  const countryRows = byCountry.map((r) => ({
    label: countryLabel(r.country),
    icon: null as ReactNode,
    count: Number(r.count),
  }));

  return {
    total: Number(totalRow[0]?.total ?? 0),
    visitors: Number(visitorsRow[0]?.visitors ?? 0),
    referrers: groupReferrers(referrerRows),
    countries: countryRows,
  };
}

export default async function LearnAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    notFound();
  }

  const params = await searchParams;
  const period = (["day", "week", "month", "all"].includes(params.period ?? "")
    ? params.period
    : "week") as Period;

  const since = getDateFilter(period) ?? new Date("2000-01-01");

  const [coachingEvents, communityEvents, communityPaid, quizFunnel, communityPaidUsers] =
    await Promise.all([
      fetchBreakdowns("quiz", since),
      fetchBreakdowns("community", since),
      fetchPaidBreakdowns("community", since),
      fetchQuizFunnel(since),
      prisma.user.count({
        where: {
          paymentProvider: { not: null },
          createdAt: { gte: since },
        },
      }),
    ]);

  const conversionPct =
    communityEvents.visitors > 0
      ? ((communityPaidUsers / communityEvents.visitors) * 100).toFixed(2)
      : "0.00";

  function buildUrl(p: Period) {
    if (p === "week") return "/learn/analytics";
    return `/learn/analytics?period=${p}`;
  }

  return (
    <>
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Analytics</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Traffic sources for coaching and community.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-black/5 p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <Link
              key={p}
              href={buildUrl(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p ? "bg-black text-white" : "text-black/60 hover:text-black"
              }`}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">Quiz funnel (/join)</h2>
        <QuizFlowChart {...quizFunnel} />
      </div>

      <div className="space-y-10">
        <Block
          title="Community"
          subtitle={`${communityEvents.total} page events`}
          referrers={communityEvents.referrers}
          countries={communityEvents.countries}
          total={communityEvents.total}
        />
        <Block
          title="Community Paid"
          subtitle={`${communityPaidUsers} paid customers · ${conversionPct}% conversion from ${communityEvents.visitors} unique visitors · ${communityPaid.total} with attribution`}
          referrers={communityPaid.referrers}
          countries={communityPaid.countries}
          total={communityPaid.total}
        />
        <Block
          title="Coaching (1:1)"
          subtitle={`${coachingEvents.total} page events`}
          referrers={coachingEvents.referrers}
          countries={coachingEvents.countries}
          total={coachingEvents.total}
        />
      </div>
    </>
  );
}

function QuizFlowChart({
  views, starts, completes, coaching, community,
}: {
  views: number;
  starts: number;
  completes: number;
  coaching: number | null;
  community: number | null;
}) {
  const pct = (num: number, denom: number) => (denom > 0 ? Math.round((num / denom) * 100) : 0);
  const hasSplit = coaching !== null && community !== null;
  const coachingPct = hasSplit ? pct(coaching!, completes) : 0;
  const communityPct = hasSplit ? pct(community!, completes) : 0;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex items-stretch gap-3">
        <FunnelNode label="Page views" count={views} />
        <Arrow label={`${pct(starts, views)}%`} sublabel="start" />
        <FunnelNode label="Quiz starts" count={starts} />
        <Arrow label={`${pct(completes, starts)}%`} sublabel="complete" />
        <FunnelNode label="Quiz completes" count={completes} />

        {hasSplit && (
          <>
            <BranchConnector topPct={coachingPct} bottomPct={communityPct} />
            <div className="flex w-44 flex-col gap-2">
              <FunnelNode label="→ Coaching" count={coaching!} pct={coachingPct} tone="coaching" small />
              <FunnelNode label="→ Community" count={community!} pct={communityPct} tone="community" small />
            </div>
          </>
        )}
      </div>

      {!hasSplit && (
        <p className="mt-3 text-center text-xs text-black/40">
          Coaching/community split requires the <code>PageEvent.ref</code> column migration.
        </p>
      )}
    </div>
  );
}

function FunnelNode({
  label, count, pct, tone, small,
}: {
  label: string;
  count: number;
  pct?: number;
  tone?: "coaching" | "community";
  small?: boolean;
}) {
  const toneStyles =
    tone === "coaching"
      ? "border-amber-200 bg-amber-50"
      : tone === "community"
        ? "border-blue-200 bg-blue-50"
        : "border-black/10 bg-black/[0.02]";
  return (
    <div className={`flex flex-1 flex-col items-center justify-center rounded-xl border px-4 ${small ? "py-2" : "py-4"} ${toneStyles}`}>
      <div className="text-[11px] text-black/50">{label}</div>
      <div className={`font-bold tabular-nums ${small ? "text-lg" : "text-2xl"}`}>
        {count.toLocaleString()}
      </div>
      {pct !== undefined && (
        <div className="text-[10px] text-black/50">{pct}%</div>
      )}
    </div>
  );
}

function Arrow({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-1 text-black/40">
      <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
        <path d="M0 8h24m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-0.5 text-[10px] font-medium">{label}</div>
      {sublabel && <div className="text-[9px] text-black/30">{sublabel}</div>}
    </div>
  );
}

function BranchConnector({ topPct, bottomPct }: { topPct: number; bottomPct: number }) {
  return (
    <div className="flex w-8 flex-col items-center justify-center text-black/40">
      <svg width="32" height="80" viewBox="0 0 32 80" fill="none" preserveAspectRatio="none">
        <path d="M0 40 H16 M16 40 V14 H28" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 40 V66 H28" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 10l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 62l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="2" y="28" fontSize="9" fill="currentColor">{topPct}%</text>
        <text x="2" y="58" fontSize="9" fill="currentColor">{bottomPct}%</text>
      </svg>
    </div>
  );
}

function Block({
  title,
  subtitle,
  referrers,
  countries,
  total,
}: {
  title: string;
  subtitle: string;
  referrers: DisplayRow[];
  countries: DisplayRow[];
  total: number;
}) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Table title="Traffic sources" rows={referrers} total={total} />
        <Table title="Countries (top 10)" rows={countries.slice(0, 10)} total={total} />
      </div>
    </div>
  );
}

function Table({ title, rows, total }: { title: string; rows: DisplayRow[]; total: number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-black/70">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-black/50">
              <th className="pb-2 text-left font-medium">Source</th>
              <th className="pb-2 text-right font-medium">Count</th>
              <th className="pb-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
              return (
                <tr key={i} className="border-b border-black/5">
                  <td className="py-1.5 break-all">
                    <span className="flex items-center gap-2">
                      {row.icon ?? <span className="inline-block w-[14px]" />}
                      <span>{row.label}</span>
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{row.count}</td>
                  <td className="py-1.5 text-right tabular-nums text-black/50">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
