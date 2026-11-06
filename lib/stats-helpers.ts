import { validWhopMemberships, whopList, whopAmount, type CurrentWhopMembership, type CurrentWhopVariant } from "./whop-current";
// ── Shared helpers used by mobile/stats route and daily-stats cron ───

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Midnight n days ago in the local timezone.
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

// ── Display helpers (PageEvent → human label) ───────────────────────────

export function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export function countryLabel(code: string): string {
  const upper = code.toUpperCase();
  const shortCodes = new Set(["US", "UK", "GB"]);
  if (shortCodes.has(upper)) return upper === "GB" ? "UK" : upper;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export const REFERRER_NAMES: Record<string, string> = {
  "www.youtube.com": "YouTube",
  "youtube.com": "YouTube",
  "m.youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "www.google.com": "Google",
  "google.com": "Google",
  "t.co": "X/Twitter",
  "twitter.com": "X/Twitter",
  "x.com": "X/Twitter",
  "www.reddit.com": "Reddit",
  "reddit.com": "Reddit",
  "www.facebook.com": "Facebook",
  "www.instagram.com": "Instagram",
  "www.tiktok.com": "TikTok",
  "www.linkedin.com": "LinkedIn",
  "linkedin.com": "LinkedIn",
  "discord.com": "Discord",
  "www.discord.com": "Discord",
  "discord.gg": "Discord",
  "tap-and-swipe.com": "t&s.com",
  "www.tap-and-swipe.com": "t&s.com",
};

export function referrerLabel(referrer: string): string {
  return REFERRER_NAMES[referrer] ?? referrer;
}

export const PRODUCT_LABELS: Record<string, string> = {
  home: "/",
  community: "/community",
  quiz: "/join",
  coaching: "/coaching",
  aso: "/aso",
  "aso-solo": "/aso",
  "aso-pro": "/aso",
  starter: "/community",
};

// ── Whop MRR ────────────────────────────────────────────────────────────

export async function fetchWhopMrr(apiKey: string): Promise<number> {
  const memberships: CurrentWhopMembership[] = [];
  for await (const membership of validWhopMemberships(apiKey)) memberships.push(membership);
  if (!memberships.length) return 0;

  const planPrices = new Map<string, number>();
  const accountIds = new Set(memberships.map((membership) => membership.account.id));
  for (const accountId of accountIds) {
    for await (const plan of whopList<CurrentWhopVariant>(apiKey, "variants", { account_id: accountId })) {
      const period = plan.billing_period;
      const monthly = plan.plan_type === "renewal" && period && period > 0
        ? (whopAmount(plan.renewal_price) / period) * 30 : 0;
      planPrices.set(plan.id, monthly);
    }
  }
  const mrr = memberships.reduce((total, membership) => total + (planPrices.get(membership.plan_id) ?? 0), 0);
  return Math.round(mrr * 100) / 100;
}

// ── Listmonk subscribers ────────────────────────────────────────────────

export async function fetchSubscriberCount(): Promise<number> {
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
