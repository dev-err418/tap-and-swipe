import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import UserJourneyFunnel from "../../components/analytics/UserJourneyFunnel";
import { journeyCohortAttributeKeys, withJourneyConversions } from "../../lib/journey-cohort-conversions";
import { buildUserJourney, userJourneyDefinition } from "../../lib/user-journey";

const day = 86_400_000;
const start = Date.parse("2026-10-01T00:00:00Z");
const end = start + 7 * day;
const asOf = start + 20 * day;
const install = (appUserId: string, installedAt = start) => ({ appUserId, installedAt, appVersion: "1.0" });
type Event = Parameters<typeof withJourneyConversions>[3][number];
const event = (appUserId: string, overrides: Partial<Event> = {}): Event => ({
  appUserId, originalTransactionId: appUserId, transactionId: appUserId, name: "initial_purchase", periodType: "normal",
  isRefund: false, netProceeds: 8, eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...overrides,
});

for (const app of ["glow", "versy", "poky"] as const) {
  test(`${app} journey metrics follow enrolled route members, including nonpayers and later transactions`, () => {
    const definition = userJourneyDefinition(app)!;
    const [first, second] = definition.variants;
    const report = buildUserJourney(definition, []);
    const member = (variant: string, extra: Record<string, string> = {}) => ({
      ...definition.cohortAttributes, [definition.variantAttribute]: variant, ...extra,
    });
    const attributes = new Map<string, Record<string, string>>([
      ["payer", member(first.key, { acquisition_source: "meta" })],
      ["free", member(first.key)],
      ["direct", member(second.key, { apple_search_ads_attribution: "true" })],
      ["legacy", { [definition.variantAttribute]: first.key }],
      ["debug", member(first.key, { [`${app}_tracking_environment`]: "development" })],
      ["old-schema", member(first.key, { [`${app}_onboarding_journey_schema`]: "0" })],
      ["old-install", member(first.key)],
      ["outside", member(first.key)],
    ]);
    assert.ok(journeyCohortAttributeKeys(app).includes(definition.variantAttribute));
    for (const key of Object.keys(definition.cohortAttributes!)) assert.ok(journeyCohortAttributeKeys(app).includes(key));
    const result = withJourneyConversions(report, app, [
      ...["payer", "free", "direct", "legacy", "debug", "old-schema"].map((id) => install(id)),
      install("payer", start + day), install("old-install", start - day), install("old-install"), install("outside", end),
    ], [
      event("payer", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
      event("", { originalTransactionId: "payer", transactionId: "renewal", name: "renewal", eventTs: start + 9 * day }),
      event("payer", { name: "cancellation", isRefund: true, netProceeds: -2, eventTs: start + 10 * day }),
      event("direct"), event("debug"), event("legacy"), event("outsider"),
      event("payer", { transactionId: "future", name: "renewal", eventTs: asOf + day }),
    ], attributes, start, end, asOf);
    const a = result.variants[0].conversions!;
    const b = result.variants[1].conversions!;
    assert.equal(a.global.installs, 2);
    assert.equal(a.global.proceeds / a.global.installs, 3);
    assert.equal(a.global.trials, 1);
    assert.equal(a.global.finishedTrials, 1);
    assert.equal(a.global.paid, 1);
    assert.equal(a.global.purchases, 1);
    assert.equal(a.global.refunds, 1);
    assert.equal(a.metaAds.proceeds, 6);
    assert.equal(a.nonAds.installs, 1);
    assert.equal(a.asa.installs, 0);
    assert.equal(b.asa.installs, 1);
    assert.equal(b.global.installPaid, 1);
    assert.equal(b.global.trials, 0);
    if (app === "versy") assert.equal(result.variants[2].conversions!.global.installs, 0);
    assert.equal(report.variants[0].conversions, undefined);

    const html = renderToStaticMarkup(createElement(UserJourneyFunnel, { appId: app, report: result, windowLabel: "Last 7 days", funnelOnly: true }));
    assert.equal((html.match(/aria-label="View screens for/g) ?? []).length, definition.variants.length);
    for (const label of ["APPU", "Trial start", "Trial → paid", "Install → paid", "Refund rate"]) assert.ok(html.includes(label), label);
    assert.ok(!html.includes('role="dialog"'));
    assert.ok(!html.includes(">Refunds</th>"));
    for (const label of ["Meta Ads", "ASA", "Organic", "APPU uses net proceeds", "earlier visits"]) assert.ok(!html.includes(label), label);
  });
}

test("missing money remains unavailable and failed journey reports are not filled with zeroes", () => {
  const definition = userJourneyDefinition("glow")!;
  const report = buildUserJourney(definition, []);
  const attributes = new Map([["a", { ...definition.cohortAttributes, [definition.variantAttribute]: "iam" }]]);
  const result = withJourneyConversions(report, "glow", [install("a")], [event("a", { netProceeds: null })], attributes, start, end, asOf);
  assert.equal(result.variants[0].conversions!.global.missingProceeds, true);
  assert.equal(result.variants[0].conversions!.global.missingInstallMoney, true);
  const unavailable = { ...report, status: "unavailable" as const };
  assert.equal(withJourneyConversions(unavailable, "glow", [], [], attributes, start, end), unavailable);
});
