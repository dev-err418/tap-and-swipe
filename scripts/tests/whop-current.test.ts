import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  WHOP_API_VERSION, whopList, isValidWhopMembership, withWhopMemberEmail,
  retrieveWhopDiscord, type CurrentWhopMembership,
} from "../../lib/whop-current";
import { findActiveMembershipByDiscordId } from "../../lib/whop";
import { fetchWhopMrr } from "../../lib/stats-helpers";

const originalFetch = globalThis.fetch;
const originalKey = process.env.WHOP_API_KEY;
const originalCommunityKey = process.env.WHOP_COMMUNITY_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [name, value] of [["WHOP_API_KEY", originalKey], ["WHOP_COMMUNITY_API_KEY", originalCommunityKey]]) {
    if (value === undefined) delete process.env[name!]; else process.env[name!] = value;
  }
});
const membership = (overrides: Partial<CurrentWhopMembership> = {}): CurrentWhopMembership => ({
  id: "mem_test", status: "active", member_id: "mber_test", user_id: "user_test",
  plan_id: "plan_test", account: { id: "biz_test" }, manage_url: "https://whop.com/billing/manage/mber_test",
  metadata: {}, ...overrides,
});
const page = (data: unknown[], cursor: string | null = null) => Response.json({
  data, page_info: { has_next_page: cursor !== null, end_cursor: cursor },
});

test("cursor pagination includes short intermediate pages and pins the API version", async () => {
  const calls: URL[] = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    calls.push(new URL(String(url)));
    assert.equal(new Headers(init?.headers).get("Api-Version-Date"), WHOP_API_VERSION);
    return calls.length === 1 ? page([{ id: "one" }], "cursor+two") : page([{ id: "two" }]);
  };
  const result = [];
  for await (const item of whopList("key", "memberships", {}, { fetchImpl })) result.push(item);
  assert.deepEqual(result, [{ id: "one" }, { id: "two" }]);
  assert.equal(calls[1].pathname, "/api/v1/memberships");
  assert.equal(calls[1].searchParams.get("after"), "cursor+two");
  assert.equal(calls[1].searchParams.has("page"), false);
});

test("failed, malformed, and repeated pagination fail instead of returning partial reports", async () => {
  for (const response of [() => new Response("", { status: 403 }), () => Response.json({ data: [] }), () => page([], "same")]) {
    const collect = async () => {
      for await (const item of whopList("key", "memberships", {}, { fetchImpl: async () => response() })) void item;
    };
    await assert.rejects(collect);
  }
});

test("active, trial, grace-period, and completed access survive until actual expiry", () => {
  for (const status of ["active", "trialing", "past_due", "completed"]) assert.equal(isValidWhopMembership(membership({ status })), true);
  for (const status of ["canceled", "expired", "unresolved"]) assert.equal(isValidWhopMembership(membership({ status })), false);
  assert.equal(isValidWhopMembership(membership({ expires_at: "2026-01-01T00:00:00Z" }), Date.parse("2026-02-01")), false);
});

test("buyer emails come from members, not the removed membership.user field", async () => {
  const result = await withWhopMemberEmail("key", membership(), async (url) => {
    assert.equal(String(url), "https://api.whop.com/api/v1/members/mber_test");
    return Response.json({ email: "buyer@example.test" });
  });
  assert.equal(result.email, "buyer@example.test");
  assert.equal(result.plan_id, "plan_test");
});

test("Discord joins use the external_account filter and skip canceled matches", async () => {
  process.env.WHOP_COMMUNITY_API_KEY = "key";
  delete process.env.WHOP_API_KEY;
  globalThis.fetch = async (url) => {
    const parsed = new URL(String(url));
    if (parsed.pathname.endsWith("/memberships")) {
      assert.equal(parsed.searchParams.get("external_account"), "discord_123");
      assert.equal(parsed.searchParams.has("valid"), false);
      return page([membership({ status: "canceled" }), membership({ id: "mem_paid" })]);
    }
    assert.equal(parsed.pathname, "/api/v1/members/mber_test");
    return Response.json({ email: "buyer@example.test" });
  };
  assert.deepEqual(await findActiveMembershipByDiscordId("123"), {
    membershipId: "mem_paid", planId: "plan_test", email: "buyer@example.test",
    manageUrl: "https://whop.com/billing/manage/mber_test", discord: { id: "123", username: "123" },
  });
});

test("Discord profile lookup reads external_id, never Whop's sacc ID", async () => {
  globalThis.fetch = async (url) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.pathname, "/api/v1/external_accounts");
    assert.equal(parsed.searchParams.get("user_id"), "user_test");
    assert.equal(parsed.searchParams.get("platform"), "discord");
    return page([{ id: "sacc_test", external_id: "123", username: "buyer" }]);
  };
  assert.deepEqual(await retrieveWhopDiscord("key", membership()), { id: "123", username: "buyer" });
});

test("MRR reads variant prices across all pages, excluding ended and one-time plans", async () => {
  globalThis.fetch = async (url) => {
    const parsed = new URL(String(url));
    if (parsed.pathname.endsWith("/memberships")) {
      return parsed.searchParams.has("after")
        ? page([membership({ plan_id: "plan_year" }), membership({ plan_id: "plan_once", status: "completed" }), membership({ status: "canceled" })])
        : page([membership()], "more_members");
    }
    assert.equal(parsed.pathname, "/api/v1/variants");
    assert.equal(parsed.searchParams.get("account_id"), "biz_test");
    return parsed.searchParams.has("after")
      ? page([
          { id: "plan_year", plan_type: "renewal", billing_period: 365, renewal_price: 365 },
          { id: "plan_once", plan_type: "one_time", billing_period: null, initial_price: 100, renewal_price: 0 },
        ])
      : page([{ id: "plan_test", plan_type: "renewal", billing_period: 30, renewal_price: 29 }], "more_variants");
  };
  assert.equal(await fetchWhopMrr("key"), 59);
});

test("MRR rejects a failed later page instead of reporting partial revenue", async () => {
  globalThis.fetch = async (url) => {
    const parsed = new URL(String(url));
    if (parsed.pathname.endsWith("/memberships")) return page([membership()]);
    return parsed.searchParams.has("after")
      ? new Response("", { status: 503 })
      : page([{ id: "plan_test", plan_type: "renewal", billing_period: 30, renewal_price: 29 }], "more");
  };
  await assert.rejects(fetchWhopMrr("key"), /failed \(503\)/);
});
