import { Whop } from "@whop/sdk";

let _whop: Whop | null = null;

export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      apiKey: process.env.WHOP_API_KEY,
      webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET ?? ""),
    });
  }
  return _whop;
}

export const WHOP_COMMUNITY_PLAN_ID =
  process.env.WHOP_COMMUNITY_PLAN_ID ?? "plan_oqXONIQZoc5kC";

export const WHOP_STARTER_PLAN_ID =
  process.env.WHOP_STARTER_PLAN_ID ?? "plan_hH1PeE0AurETn";

export const WHOP_ASO_PRODUCT_ID =
  process.env.WHOP_ASO_PRODUCT_ID ?? "prod_abrmSHV7CFEx9";

export const WHOP_ASO_SOLO_MONTHLY_PLAN_ID =
  process.env.WHOP_ASO_SOLO_MONTHLY_PLAN_ID ?? "plan_fK1oF70OvsVrX";

export const WHOP_ASO_PRO_MONTHLY_PLAN_ID =
  process.env.WHOP_ASO_PRO_MONTHLY_PLAN_ID ?? "plan_RQHfHA6tQgBih";

export const WHOP_ASO_SOLO_YEARLY_PLAN_ID =
  process.env.WHOP_ASO_SOLO_YEARLY_PLAN_ID ?? "plan_tYVsXnoZiUwWb";

export const WHOP_ASO_PRO_YEARLY_PLAN_ID =
  process.env.WHOP_ASO_PRO_YEARLY_PLAN_ID ?? "plan_9Etf61vjiXNg6";

const WHOP_ASO_SOLO_PLAN_IDS = new Set([
  WHOP_ASO_SOLO_MONTHLY_PLAN_ID,
  WHOP_ASO_SOLO_YEARLY_PLAN_ID,
]);

const WHOP_ASO_PRO_PLAN_IDS = new Set([
  WHOP_ASO_PRO_MONTHLY_PLAN_ID,
  WHOP_ASO_PRO_YEARLY_PLAN_ID,
]);

export interface WhopMembershipMatch {
  membershipId: string;
  email: string | null;
  planId: string | null;
  manageUrl: string | null;
  discord: { id: string; username: string };
}

function readDiscord(m: Record<string, unknown>): { id: string; username: string } | null {
  const d = m.discord;
  if (typeof d === "string" && d.length > 0) return { id: d, username: d };
  if (typeof d === "object" && d !== null && "id" in (d as Record<string, unknown>)) {
    const obj = d as Record<string, unknown>;
    const id = String(obj.id);
    const username = typeof obj.username === "string" && obj.username.length > 0 ? obj.username : id;
    return { id, username };
  }
  return null;
}

function readPlanId(m: Record<string, unknown>): string | null {
  const plan = m.plan;
  if (typeof plan === "string" && plan.length > 0) return plan;
  if (typeof plan === "object" && plan !== null && "id" in (plan as Record<string, unknown>)) {
    const id = (plan as Record<string, unknown>).id;
    if (typeof id === "string") return id;
  }
  // Whop v2 sometimes returns plan_id at top level
  const flat = m.plan_id;
  if (typeof flat === "string") return flat;
  return null;
}

function readEmail(m: Record<string, unknown>): string | null {
  if (typeof m.email === "string" && m.email.length > 0) return m.email;
  const user = m.user;
  if (typeof user === "object" && user !== null) {
    const e = (user as Record<string, unknown>).email;
    if (typeof e === "string" && e.length > 0) return e;
  }
  return null;
}

/**
 * Find an active Whop membership whose linked Discord user matches the given ID.
 *
 * Whop's REST API doesn't support filtering memberships by discord ID, so
 * we paginate through valid memberships and short-circuit on match. Volume
 * is low enough (a handful of active Community memberships) that ~1-5 page
 * fetches is acceptable on the rare guildMemberAdd event.
 */
export async function findActiveMembershipByDiscordId(
  discordId: string,
  opts: { maxPages?: number; perPage?: number } = {}
): Promise<WhopMembershipMatch | null> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    console.warn("[whop] findActiveMembershipByDiscordId: WHOP_API_KEY not set");
    return null;
  }
  const maxPages = opts.maxPages ?? 20;
  const perPage = opts.perPage ?? 50;

  for (let page = 1; page <= maxPages; page++) {
    const url = new URL("https://api.whop.com/api/v2/memberships");
    url.searchParams.set("valid", "true");
    url.searchParams.set("per", String(perPage));
    url.searchParams.set("page", String(page));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.warn(
        `[whop] findActiveMembershipByDiscordId: page=${page} status=${res.status}`
      );
      return null;
    }
    const json = (await res.json()) as { data?: Record<string, unknown>[] };
    const memberships = json.data ?? [];
    if (memberships.length === 0) return null;

    for (const m of memberships) {
      const discord = readDiscord(m);
      if (discord && discord.id === discordId) {
        return {
          membershipId: String(m.id),
          email: readEmail(m),
          planId: readPlanId(m),
          manageUrl: typeof m.manage_url === "string" ? m.manage_url : null,
          discord,
        };
      }
    }

    if (memberships.length < perPage) return null;
  }
  console.warn(
    `[whop] findActiveMembershipByDiscordId: no match after ${maxPages} pages for discordId=${discordId}`
  );
  return null;
}

export function tierFromWhopPlanId(planId: string | null | undefined): "full" | "starter" {
  if (planId === WHOP_STARTER_PLAN_ID) return "starter";
  return "full";
}

export function asoPlanFromWhopPlanId(
  planId: string | null | undefined
): "solo" | "pro" | null {
  if (!planId) return null;
  if (WHOP_ASO_SOLO_PLAN_IDS.has(planId)) return "solo";
  if (WHOP_ASO_PRO_PLAN_IDS.has(planId)) return "pro";
  return null;
}

export function isAsoWhopPlanId(planId: string | null | undefined): boolean {
  return asoPlanFromWhopPlanId(planId) !== null;
}
