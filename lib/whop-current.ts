// Whop's Current API uses /api/v1. Pin the wire format independently of the
// older SDK still used for checkout and webhook signature verification.
export const WHOP_API_VERSION = "2026-10-27";
const WHOP_API_BASE = "https://api.whop.com/api/v1";

export interface CurrentWhopMembership {
  id: string;
  status: string;
  plan_id: string;
  user_id: string | null;
  member_id: string | null;
  account: { id: string };
  manage_url: string | null;
  expires_at?: string | null;
  metadata: Record<string, unknown>;
  email?: string | null;
  discord?: { id: string; username: string } | null;
}
export interface CurrentWhopVariant {
  id: string;
  title: string | null;
  currency: string;
  billing_period: number | null;
  plan_type: string;
  initial_price: number;
  renewal_price: number;
}

export class WhopRequestError extends Error {
  constructor(public readonly status: number, path: string) {
    super(`Whop ${path.split("?")[0]} failed (${status})`);
  }
}

export async function whopGet<T>(apiKey: string, path: string, fetchImpl: typeof fetch = fetch): Promise<T> {
  if (!apiKey) throw new Error("Whop API key is not configured");
  const response = await fetchImpl(`${WHOP_API_BASE}/${path}`, {
    headers: { authorization: `Bearer ${apiKey}`, "Api-Version-Date": WHOP_API_VERSION },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new WhopRequestError(response.status, path);
  return await response.json() as T;
}

export async function* whopList<T>(
  apiKey: string,
  resource: "memberships" | "variants" | "external_accounts",
  params: Record<string, string> = {},
  options: { maxPages?: number; perPage?: number; fetchImpl?: typeof fetch } = {},
): AsyncGenerator<T> {
  const query = new URLSearchParams(params);
  query.set("first", String(Math.max(1, Math.min(100, options.perPage ?? 100))));
  const seen = new Set<string>();
  for (let page = 0; page < (options.maxPages ?? 1_000); page++) {
    const body = await whopGet<{
      data: T[];
      page_info: { has_next_page: boolean; end_cursor: string | null };
    }>(apiKey, `${resource}?${query}`, options.fetchImpl);
    if (!Array.isArray(body.data) || typeof body.page_info?.has_next_page !== "boolean") {
      throw new Error(`Invalid Whop ${resource} pagination response`);
    }
    for (const item of body.data) yield item;
    if (!body.page_info.has_next_page) return;
    const cursor = body.page_info.end_cursor;
    if (!cursor || seen.has(cursor)) throw new Error(`Invalid Whop ${resource} cursor`);
    seen.add(cursor);
    query.set("after", cursor);
  }
  throw new Error(`Whop ${resource} pagination limit exceeded`);
}

// Status filters have different semantics for cancel-at-period-end memberships.
// Check the returned billing state so those customers keep access until expiry.
export function isValidWhopMembership(membership: CurrentWhopMembership, now = Date.now()): boolean {
  if (!["active", "trialing", "past_due", "completed"].includes(membership.status)) return false;
  return !membership.expires_at || Date.parse(membership.expires_at) > now;
}

export async function withWhopMemberEmail(
  apiKey: string, membership: CurrentWhopMembership, fetchImpl: typeof fetch = fetch,
): Promise<CurrentWhopMembership> {
  if (!membership.member_id) return membership;
  const member = await whopGet<{ email: string | null }>(apiKey, `members/${encodeURIComponent(membership.member_id)}`, fetchImpl);
  return { ...membership, email: member.email };
}

export async function retrieveWhopMembership(apiKey: string, id: string): Promise<CurrentWhopMembership> {
  const membership = await whopGet<CurrentWhopMembership>(apiKey, `memberships/${encodeURIComponent(id)}`);
  return withWhopMemberEmail(apiKey, membership);
}

export async function retrieveWhopDiscord(
  apiKey: string, membership: CurrentWhopMembership,
): Promise<{ id: string; username: string } | null> {
  const discordId = membership.metadata?.discordId;
  if (typeof discordId === "string" && discordId) return { id: discordId, username: discordId };
  if (!membership.user_id) return null;
  for await (const account of whopList<{ external_id: string | null; username: string | null }>(
    apiKey, "external_accounts", { user_id: membership.user_id, platform: "discord" },
  )) {
    if (account.external_id) return { id: account.external_id, username: account.username ?? account.external_id };
  }
  return null;
}

export async function resolveWhopAccountId(apiKey: string): Promise<string> {
  // Memberships already include their account; avoid requiring balance-read
  // permission just to list variants for an existing business.
  for await (const membership of whopList<CurrentWhopMembership>(apiKey, "memberships", {}, { perPage: 1 })) {
    if (membership.account?.id) return membership.account.id;
  }
  const account = await whopGet<{ id: string }>(apiKey, "accounts/me");
  if (!account.id) throw new Error("Whop account ID is missing");
  return account.id;
}

export async function* validWhopMemberships(apiKey: string): AsyncGenerator<CurrentWhopMembership> {
  for await (const membership of whopList<CurrentWhopMembership>(apiKey, "memberships")) {
    if (isValidWhopMembership(membership)) yield membership;
  }
}

export function whopAmount(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Invalid Whop monetary amount");
  return value;
}
