import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildGlowOnboardingReport, DAY_MS, GLOW_PAYWALL_FLOW_LEGACY_ID, GLOW_PAYWALL_FLOW_LEGACY_KEY, GLOW_PAYWALL_FLOW_ALLOCATION, GLOW_PAYWALL_FLOWS, GLOW_PAYWALL_FLOW_ID, GLOW_PAYWALL_FLOW_KEY } from "../../lib/glow-onboarding-experience";
import { loadGlowOnboardingExperience } from "../../lib/glow-onboarding-experience-queries";
import type { PaywallAttribute, PaywallRevenue } from "../../lib/native-paywall-analytics";
import { appExperimentFlow } from "../../lib/app-experiment-flow";
import { experimentMapDetailTarget } from "../../lib/experiment-map-details";
import ExperimentMapDetails from "../../components/analytics/ExperimentMapDetails";

const start = Date.now() - 10 * DAY_MS;
const end = Date.now();
function assignment(user: string, variant: string, extra: Record<string, unknown> = {}): PaywallAttribute {
  return { appUserId: user, key: GLOW_PAYWALL_FLOW_KEY, value: JSON.stringify({ schema: 1,
    experiment: GLOW_PAYWALL_FLOW_ID, allocation: GLOW_PAYWALL_FLOW_ALLOCATION, environment: "production", randomized: true,
    variant, language: "es", assignedAt: start, updatedAt: start + DAY_MS, reminderLeadDays: 3,
    priceVariant: "yr_34", onboardingJourney: "conversation", ...extra }) };
}
function revenue(id: string, user: string, amount: number, extra: Partial<PaywallRevenue> = {}): PaywallRevenue {
  const ts = new Date(start + 2 * DAY_MS).toISOString();
  return { id, appUserId: user, name: "initial_purchase", originalTransactionId: `original-${id}`,
    transactionId: id, isRefund: 0, price: amount, proceeds: amount, ts, purchasedAt: ts, attributionTs: ts, ...extra };
}

test("flow denominator includes dropouts; paid conversion excludes trials; net proceeds deduplicate refunds", () => {
  const charge = revenue("recovery", "payer", 20);
  const refund = { ...charge, name: "cancellation", proceeds: 5, price: 5, isRefund: 1 };
  const report = buildGlowOnboardingReport([
    assignment("payer", "versy_reminder", { viewedAt: start + 1000 }),
    assignment("dropout", "versy_reminder"), assignment("trial", "standard", { viewedAt: start + 1000 }),
  ], [charge, charge, refund, refund, revenue("renewal", "payer", 8, { name: "renewal" }),
    revenue("trial", "trial", 0)], start, end, end, GLOW_PAYWALL_FLOW_ID);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.rows[0].paid, 0);
  assert.equal(report.rows[2].users, 2);
  assert.equal(report.rows[2].viewed, 1);
  assert.equal(report.rows[2].paid, 1);
  assert.equal(report.rows[2].proceeds, 23);
  assert.equal(report.rows[2].arpu, 11.5);
  const node = appExperimentFlow("glow")!.nodes.find((n) => n.id === "versy_reminder")!;
  assert.equal(experimentMapDetailTarget(node, "en")?.language, "all");
  const main = buildGlowOnboardingReport([], [], start, end, end);
  const markup = renderToStaticMarkup(createElement(ExperimentMapDetails, {
    node, language: "en", experiments: [], nativePaywalls: null, onboardingExperience: { ...main, paywallFlow: report },
  }));
  assert.match(markup, /Paywall flows with testimonials/);
  assert.match(markup, /50.0%/);
  assert.match(markup, /\$11.50/);
});

test("sandbox, forced, wrong experiment and impossible view dates cannot contaminate the split", () => {
  const report = buildGlowOnboardingReport([
    assignment("ok", "standard"), assignment("sandbox", "versy_reminder", { environment: "development" }),
    assignment("forced", "versy_reminder", { randomized: false }),
    assignment("old", "versy_reminder", { experiment: "onboarding_manifest_audio_v3" }),
    assignment("future-view", "versy_reminder", { viewedAt: end + 1 }),
    assignment("wrong-split", "versy_reminder", { allocation: "30_70" }),
  ], [], start, end, end, GLOW_PAYWALL_FLOW_ID);
  assert.deepEqual(report.rows.map((r) => r.users), [1, 0, 0, 0]);
  assert.equal(report.warnings.length, 1);
});

test("loader fetches flow-only users and exposes separate results even without an onboarding record", async () => {
  const sqls: string[] = [];
  const query = async <T,>(sql: string): Promise<T[]> => {
    sqls.push(sql);
    return (sqls.length === 1 ? [assignment("flow-only", "versy_reminder")] : [revenue("paid", "flow-only", 10)]) as T[];
  };
  const report = await loadGlowOnboardingExperience(query, 54736, start, end);
  assert.match(sqls[0], /gpf1_onboarding_paywall_flow_v1/);
  assert.match(sqls[0], /gpf1_onboarding_paywall_flow_v2/);
  assert.match(sqls[1], /'flow-only'/);
  assert.equal(report.status, "empty");
  assert.equal(report.paywallFlow?.status, "ready");
  assert.equal(report.paywallFlow?.rows[2].arpu, 10);
});

test("four note-test arms keep testimonial dropouts and revenue separate from the old experiment", () => {
  const current = GLOW_PAYWALL_FLOWS.map(({ id }, i) => assignment(`arm-${i}`, id,
    i === 1 ? {} : { viewedAt: start + 1000 }));
  const legacy: PaywallAttribute = { appUserId: "legacy", key: GLOW_PAYWALL_FLOW_LEGACY_KEY,
    value: JSON.stringify({ schema: 1, experiment: GLOW_PAYWALL_FLOW_LEGACY_ID, allocation: "50_50",
      variant: "standard", environment: "production", randomized: true, language: "en",
      assignedAt: start, updatedAt: start + DAY_MS, viewedAt: start + 1000 }) };
  const wrongAllocation = assignment("wrong", "standard_note", { allocation: "50_50" });
  const rows = [...current, legacy, wrongAllocation];
  const events = [revenue("note-paid", "arm-3", 12), revenue("old-paid", "legacy", 99)];
  const active = buildGlowOnboardingReport(rows, events, start, end, end, GLOW_PAYWALL_FLOW_ID);
  assert.deepEqual(active.rows.map((r) => r.users), [1, 1, 1, 1]);
  assert.equal(active.rows[1].viewed, 0);
  assert.equal(active.rows[1].arpu, 0);
  assert.equal(active.rows[3].arpu, 12);
  const historical = buildGlowOnboardingReport(rows, events, start, end, end, GLOW_PAYWALL_FLOW_LEGACY_ID);
  assert.deepEqual(historical.rows.map((r) => r.users), [1, 0]);
  assert.equal(historical.rows[0].arpu, 99);
});
