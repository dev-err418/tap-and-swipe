import { whopList, isValidWhopMembership, withWhopMemberEmail, type CurrentWhopMembership } from "./whop-current";
import { Whop } from "@whop/sdk";

let _whop: Whop | null = null;
let _asoWhop: Whop | null = null;

export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      apiKey: process.env.WHOP_API_KEY,
      webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET ?? ""),
    });
  }
  return _whop;
}

export function getAsoWhop(): Whop {
  if (!_asoWhop) {
    _asoWhop = new Whop({
      apiKey: process.env.WHOP_ASO_API_KEY,
    });
  }
  return _asoWhop;
}

export const WHOP_COMMUNITY_PLAN_ID =
  process.env.WHOP_COMMUNITY_PLAN_ID ?? "plan_oqXONIQZoc5kC";

export const WHOP_STARTER_PLAN_ID =
  process.env.WHOP_STARTER_PLAN_ID ?? "plan_hH1PeE0AurETn";

export const WHOP_ASO_SOLO_MONTHLY_PLAN_ID =
  process.env.WHOP_ASO_SOLO_MONTHLY_PLAN_ID ?? "plan_BF7kly9eWXJQ7";

export const WHOP_ASO_PRO_MONTHLY_PLAN_ID =
  process.env.WHOP_ASO_PRO_MONTHLY_PLAN_ID ?? "plan_qz2pxGxUywEVk";

export const WHOP_ASO_SOLO_YEARLY_PLAN_ID =
  process.env.WHOP_ASO_SOLO_YEARLY_PLAN_ID ?? "plan_4mQ4gJbuCcPH9";

export const WHOP_ASO_PRO_YEARLY_PLAN_ID =
  process.env.WHOP_ASO_PRO_YEARLY_PLAN_ID ?? "plan_wxULP9aKmyK1j";

export interface WhopMembershipMatch {
  membershipId: string;
  email: string | null;
  planId: string | null;
  manageUrl: string | null;
  discord: { id: string; username: string };
}

/** Find a paid membership using Whop's server-side Discord filter. */
export async function findActiveMembershipByDiscordId(
  discordId: string,
  opts: { maxPages?: number; perPage?: number } = {},
): Promise<WhopMembershipMatch | null> {
  const keys = [...new Set([process.env.WHOP_COMMUNITY_API_KEY, process.env.WHOP_API_KEY].filter((key): key is string => Boolean(key)))];
  if (!keys.length) throw new Error("Whop community API key is not configured");
  for (const apiKey of keys) {
    for await (const membership of whopList<CurrentWhopMembership>(
      apiKey, "memberships", { external_account: `discord_${discordId}` }, opts,
    )) {
      if (!isValidWhopMembership(membership)) continue;
      const member = await withWhopMemberEmail(apiKey, membership);
      return {
        membershipId: member.id,
        email: member.email ?? null,
        planId: member.plan_id,
        manageUrl: member.manage_url,
        discord: { id: discordId, username: discordId },
      };
    }
  }
  return null;
}

export function tierFromWhopPlanId(planId: string | null | undefined): "full" | "starter" {
  if (planId === WHOP_STARTER_PLAN_ID) return "starter";
  return "full";
}
