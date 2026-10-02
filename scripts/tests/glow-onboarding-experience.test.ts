import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GlowOnboardingExperiencePanel from "../../components/analytics/GlowOnboardingExperiencePanel";
import { buildGlowOnboardingReport, GLOW_ONBOARDING_ID, GLOW_ONBOARDING_KEY, DAY_MS } from "../../lib/glow-onboarding-experience";
import { loadGlowOnboardingExperience } from "../../lib/glow-onboarding-experience-queries";
import type { PaywallAttribute, PaywallPurchase, PaywallRevenue } from "../../lib/native-paywall-analytics";

const start = Date.parse("2026-10-01T00:00:00Z");
const asOf = start + 10 * DAY_MS;
function assignment(id: string, variant = "current", at = start, extra: Record<string, unknown> = {}): PaywallAttribute {
  return { appUserId: id, key: GLOW_ONBOARDING_KEY, value: JSON.stringify({ schema: 1, experiment: GLOW_ONBOARDING_ID,
    allocation: "15_85", variant, environment: "production", language: "en", randomized: true,
    assignedAt: at, updatedAt: at, days: { "0": { sessions: 1, active: true } }, ...extra }) };
}
function event(user: string, transaction: string, amount = 10, extra: Partial<PaywallRevenue> = {}): PaywallRevenue {
  const ts = new Date(start + DAY_MS).toISOString();
  return { appUserId: user, id: transaction, name: "initial_purchase", originalTransactionId: `original-${transaction}`,
    transactionId: transaction, isRefund: 0, price: amount, proceeds: amount, ts, purchasedAt: ts, attributionTs: ts, ...extra };
}

test("the 15/85 allocation reports both variants and preserves earlier 30/70 records", () => {
  const report = buildGlowOnboardingReport([
    assignment("current"), assignment("treatment", "mascot_free"),
    assignment("earlier", "current", start, { allocation: "30_70" }),
    assignment("unknown", "current", start, { allocation: "50_50" }),
  ], [], start, asOf, asOf);
  assert.deepEqual(report.rows.map((row) => [row.label, row.users]), [["Current · 15%", 2], ["No mascot · 85%", 1]]);
  assert.equal(report.warnings.length, 1);
});

test("ARPU includes non-payers and every post-assignment purchase, renewal and refund once", () => {
  const a = [assignment("payer"), assignment("nonpayer"), assignment("new", "mascot_free")];
  const charge = event("payer", "charge", 20);
  const renewal = event("payer", "renewal", 8, { name: "renewal" });
  const refund = event("payer", "charge", 5, { isRefund: 1, name: "cancellation" });
  const report = buildGlowOnboardingReport(a, [charge, charge, renewal, refund, refund,
    event("payer", "before", 100, { ts: new Date(start - 1).toISOString() }),
    event("outsider", "other", 100), event("payer", "cancel", 100, { name: "cancellation", originalTransactionId: "original-charge" }),
    event("payer", "future", 100, { ts: new Date(asOf + 1).toISOString() })], start, asOf, asOf);
  assert.equal(report.status, "ready");
  assert.deepEqual(report.warnings, []);
  assert.equal(report.rows[0].users, 2);
  assert.equal(report.rows[0].proceeds, 23);
  assert.equal(report.rows[0].arpu, 11.5);
  assert.equal(report.rows[0].paid, 1);
  assert.equal(report.rows[0].proceedsVariance, 264.5);
  assert.equal(report.rows[1].arpu, 0);
});

test("sessions use Poky's observed person-day denominator including inactive users", () => {
  const attrs = [assignment("old", "current", start, { updatedAt: asOf, days: {
    "0": { sessions: 1, active: true }, "9": { sessions: 4, active: true } } }),
    assignment("recent", "current", start + 5 * DAY_MS)];
  const row = buildGlowOnboardingReport(attrs, [], start, asOf, asOf).rows[0];
  assert.equal(row.sessions, 6);
  assert.equal(row.sessionUserDays, 15);
  assert.equal(row.sessionsPerUserDay, 6 / 15);
  assert.notEqual(row.sessionsPerUserDay, (5 / 10 + 1 / 5) / 2);
  const mature = buildGlowOnboardingReport(attrs, [], start, asOf, asOf + 50 * DAY_MS).rows[0];
  assert.equal(mature.sessionUserDays, 62);
});

test("historical copy, sandbox, forced, future and invalid records cannot enter the cohort", () => {
  const valid = assignment("valid");
  const report = buildGlowOnboardingReport([valid, valid, assignment("sandbox", "current", start, { environment: "sandbox" }),
    assignment("forced", "current", start, { randomized: false }), assignment("dev", "current", start, { environment: "development" }),
    assignment("copy", "copy"), assignment("bad-day", "current", start, { days: { "0": { sessions: -1, active: true } } }),
    assignment("conflict"), assignment("conflict", "mascot_free"), assignment("future", "current", asOf + 1),
    { appUserId: "legacy", key: "onboarding_variant", value: "iam" }], [], start, asOf, asOf);
  assert.equal(report.rows[0].users, 1);
  assert.equal(report.rows[1].users, 0);
  assert.equal(report.rows[1].arpu, null);
  assert.equal(report.rows[1].sessionsPerUserDay, null);
  assert.equal(report.warnings.length, 1);
});

test("latest attribution revision wins and incomplete money withholds ARPU", () => {
  const a = [assignment("payer")];
  const older = event("payer", "txn", 20);
  const revised = event("payer", "txn", 12, { attributionTs: new Date(start + 2 * DAY_MS).toISOString() });
  assert.equal(buildGlowOnboardingReport(a, [revised, older], start, asOf, asOf).rows[0].arpu, 12);
  const report = buildGlowOnboardingReport(a, [event("payer", "missing", 20, { proceeds: null })], start, asOf, asOf);
  assert.equal(report.rows[0].arpu, null);
  assert.equal(report.rows[0].proceeds, null);
  assert.equal(report.rows[0].sessions, 1);
  assert.equal(report.warnings.length, 1);
});

test("cohort dates select assignment; unfinished onboarding stays in the denominator", () => {
  const attrs = [assignment("first", "current", start, { completedAt: start + DAY_MS, updatedAt: start + DAY_MS }),
    assignment("abandoned"), assignment("before", "current", start - 1, { updatedAt: asOf }),
    assignment("end", "current", start + 2 * DAY_MS)];
  const report = buildGlowOnboardingReport(attrs, [], start, start + 2 * DAY_MS, asOf);
  assert.equal(report.rows[0].users, 2);
  assert.equal(report.rows[0].completed, 1);
});

test("a verified purchase awaiting authoritative server revenue withholds ARPU", () => {
  const purchase: PaywallPurchase = {
    context: { schema: 1, environment: "production", experiment: "native_paywall_v2", experimentName: "Paywalls",
      variant: "yr_59", variantName: "Yearly", paywall: "yr_59", language: "en", assignedAt: start,
      randomized: true, variantCount: 5, expectedProduct: "glow.yearly", placement: "home_crown",
      reachedAt: start, viewedAt: start },
    productID: "glow.yearly", startedAt: start + 1, purchasedAt: start + DAY_MS,
    transactionID: "123", originalTransactionID: "456",
  };
  const attrs = [assignment("payer"), { appUserId: "payer", key: "gp1_t_123", value: JSON.stringify(purchase) }];
  const missing = buildGlowOnboardingReport(attrs, [], start, asOf, asOf);
  assert.equal(missing.rows[0].arpu, null);
  assert.equal(missing.warnings.length, 1);
  const delivered = buildGlowOnboardingReport(attrs, [event("payer", "123", 8, { originalTransactionId: "456" })], start, asOf, asOf);
  assert.equal(delivered.rows[0].arpu, 8);
  assert.deepEqual(delivered.warnings, []);
});

test("average time to cancel starts with the first subscription/trial and counts cancelled users once", () => {
  const attrs = [assignment("trial"), assignment("paid"), assignment("active"), assignment("refunded")];
  const startAt = new Date(start + DAY_MS).toISOString();
  const paidStart = event("paid", "paid", 10, { ts: startAt });
  const trialStart = event("trial", "trial", 0, { ts: startAt });
  const cancelled = (user: string, txn: string, after: number, extra: Partial<PaywallRevenue> = {}) => event(user, txn, 0, {
    name: "cancellation", ts: new Date(start + DAY_MS + after).toISOString(), ...extra,
  });
  const report = buildGlowOnboardingReport(attrs, [paidStart, trialStart, event("active", "active"), event("refunded", "refunded"),
    cancelled("trial", "trial", 10 * 60_000), cancelled("trial", "trial", 10 * 60_000),
    cancelled("trial", "trial", 30 * 60_000), cancelled("paid", "paid", 50 * 60_000),
    cancelled("refunded", "refunded", 5 * 60_000, { isRefund: 1 }),
    event("paid", "renewal", 10, { name: "renewal", originalTransactionId: "original-paid" }),
    event("trial", "second", 0, { ts: new Date(start + 2 * DAY_MS).toISOString() }),
    cancelled("trial", "second", 2 * DAY_MS),
    cancelled("active", "active", 20 * DAY_MS),
  ], start, asOf, asOf);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.rows[0].cancelledUsers, 2);
  assert.equal(report.rows[0].avgTimeToCancelMs, 30 * 60_000);
  assert.equal(report.rows[1].avgTimeToCancelMs, null);
});

test("unmatched or invalid cancellation timing never becomes a false average", () => {
  const attrs = [assignment("user")];
  const unmatched = buildGlowOnboardingReport(attrs, [event("user", "unknown", 0, { name: "cancellation" })], start, asOf, asOf);
  assert.equal(unmatched.rows[0].avgTimeToCancelMs, null);
  assert.equal(unmatched.rows[0].arpu, 0);
  assert.match(unmatched.warnings[0], /matching subscription start/);
  const reversed = buildGlowOnboardingReport(attrs, [event("user", "trial", 0, { ts: new Date(start + 2 * DAY_MS).toISOString() }),
    event("user", "trial", 0, { name: "cancellation" })], start, asOf, asOf);
  assert.equal(reversed.rows[0].avgTimeToCancelMs, null);
  assert.equal(reversed.warnings.length, 1);
});

test("the comparison shows all three metrics with empty and unavailable values kept honest", () => {
  const empty = buildGlowOnboardingReport([], [], start, asOf, asOf);
  const markup = renderToStaticMarkup(createElement(GlowOnboardingExperiencePanel, { report: empty }));
  assert.match(markup, /enabled in the next app build/);
  assert.match(markup, /results appear after that build is released/);
  assert.match(markup, /15% Current · 85% No mascot/);
  assert.match(markup, /ARPU/);
  assert.match(markup, /Sessions \/ user \/ day/);
  assert.match(markup, /Avg time to cancel/);
  assert.doesNotMatch(markup, /\$0\.00/);
  const unavailable = renderToStaticMarkup(createElement(GlowOnboardingExperiencePanel, { report: { ...empty, status: "unavailable" } }));
  assert.match(unavailable, /unavailable/);
  assert.doesNotMatch(unavailable, /\$0\.00/);
});

test("query failure never returns partial revenue or false zero", async () => {
  let calls = 0;
  const query = async <T,>(): Promise<T[]> => {
    calls++;
    if (calls === 1) return [assignment("payer", "current", Date.now() - DAY_MS)] as T[];
    throw new Error("money unavailable");
  };
  const report = await loadGlowOnboardingExperience(query, 54736, 0, Date.now());
  assert.equal(report.status, "unavailable");
  assert.equal(report.rows.length, 0);
});

test("query fetches outcomes by assignment regardless of product, with production filters", async () => {
  const sqls: string[] = [];
  const query = async <T,>(sql: string): Promise<T[]> => {
    sqls.push(sql);
    return (sqls.length === 1 ? [assignment("O'Reilly", "current", Date.now() - DAY_MS)] : []) as T[];
  };
  const report = await loadGlowOnboardingExperience(query, 54736, 0, Date.now());
  assert.equal(report.status, "ready");
  assert.match(sqls[0], /isSandbox = 0 AND isDeleted = 0/);
  assert.match(sqls[1], /source = 'integration' AND isFamilyShare = 0/);
  assert.match(sqls[1], /O\\'Reilly/);
  assert.doesNotMatch(sqls[1], /productId\s*=/);
  assert.match(sqls[1], /'cancellation'/);
});
