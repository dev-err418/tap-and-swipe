import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppOverviewPanel from "../../components/analytics/AppOverviewPanel";
import { topAnalyticsCountries } from "../../lib/analytics-country-options";
import { buildAppCountryComparisons } from "../../lib/app-country-comparisons";
import { experimentMinimumInstallVersion } from "../../lib/app-experiment-cohort";
import { GLOW_PAYWALL_FLOW_ID, GLOW_PAYWALL_FLOW_KEY } from "../../lib/glow-onboarding-experience";
import { VERSY_YEARLY_PRICE_EXPERIMENT, VERSY_YEARLY_PRICES } from "../../lib/versy-yearly-price-cohorts";
import { ASSIGNED_KEY, buildUserJourney, userJourneyDefinition } from "../../lib/user-journey";
import { loadUserJourney } from "../../lib/user-journey-queries";

const day = 86_400_000, start = Date.parse("2026-10-01T00:00:00Z"), asOf = start + 20 * day;
const install = (appUserId: string, country: string, appVersion = "1.8.3", installedAt = start) => ({ appUserId, country, appVersion, installedAt });
type Event = Parameters<typeof buildAppCountryComparisons>[0]["events"][number];
const event = (appUserId: string, extra: Partial<Event> = {}): Event => ({ appUserId, originalTransactionId: appUserId,
  transactionId: appUserId, name: "initial_purchase", periodType: "normal", netProceeds: 30, isRefund: false,
  isTrialConversion: false, eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...extra });

test("top three countries count unique first installs, excluding unknown countries with stable tie ordering", () => {
  assert.deepEqual(topAnalyticsCountries([
    install("us1", "US"), install("us2", "us"), install("us1", "FR", "1.8.4", start + day),
    install("mx", "MX"), install("ca", "CA"), install("gb", "GB"), install("unknown", "unknown"),
  ]), [{ code: "US", installs: 2 }, { code: "CA", installs: 1 }, { code: "GB", installs: 1 }]);
});

for (const appId of ["glow", "poky", "versy"] as const) {
  test(`${appId} country comparisons preserve nonpayers and anonymous subscription outcomes without cross-country leakage`, () => {
    const definition = userJourneyDefinition(appId)!;
    const variant = definition.variants[0].key;
    const attrs = {
      ...definition.cohortAttributes, [definition.variantAttribute]: variant,
      [GLOW_PAYWALL_FLOW_KEY]: JSON.stringify({ schema: 1, experiment: GLOW_PAYWALL_FLOW_ID, allocation: "50_50",
        environment: "production", randomized: true, language: "en", variant: "standard", assignedAt: start, updatedAt: start }),
      gp1_a_native_yearly_prices_v4: JSON.stringify({ schema: 1, experiment: "native_yearly_prices_v4", experimentName: "Yearly prices",
        variant: "yr_34", variantName: "yr_34", paywall: "yr_34", language: "en", expectedProduct: "yearly", assignedAt: start,
        randomized: true, variantCount: 3, environment: "production" }),
      onboarding_offer_experiment: "poky_onboarding_trial_v3", onboarding_offer_variant: "current", onboarding_offer_allocation: "25_25_25_25",
      onboarding_offer_assigned_at: String(start), yearly_price_experiment_id: VERSY_YEARLY_PRICE_EXPERIMENT,
      yearly_price_allocation: "50_50", yearly_price_product_id: VERSY_YEARLY_PRICES[0].productID, yearly_price_assigned_at: String(start),
    };
    const journey = (assigned: number) => buildUserJourney(definition, [
      { variant, key: ASSIGNED_KEY, users: assigned }, { variant, key: definition.variants[0].steps[0].attribute, users: assigned },
    ]);
    const report = buildAppCountryComparisons({ appId, asOf,
      installs: [install("payer", "US", experimentMinimumInstallVersion(appId)), install("free", "US", experimentMinimumInstallVersion(appId)),
        install("mexico", "MX", experimentMinimumInstallVersion(appId)), install("old", "FR", "1.0.0"),
        install("old", "US", experimentMinimumInstallVersion(appId), start + day)],
      events: [event("payer", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
        event("", { originalTransactionId: "payer", transactionId: "paid", name: "renewal", netProceeds: 12, eventTs: start + 8 * day }),
        event("", { originalTransactionId: "payer", transactionId: "paid", name: "cancellation", isRefund: true, netProceeds: -2, eventTs: start + 9 * day }),
        event("mexico")],
      attributes: new Map(["payer", "free", "mexico", "old"].map((id) => [id, attrs])),
      journey: journey(3), journeyCountries: { US: journey(2), MX: journey(1) },
    });
    assert.deepEqual(report.options, [{ code: "US", installs: 2 }, { code: "MX", installs: 1 }]);
    for (const [code, installs, proceeds] of [["US", 2, 10], ["MX", 1, 30]] as const) {
      const slice = report.slices[code];
      assert.equal(slice.userJourney!.variants[0].assigned, installs);
      assert.equal(slice.userJourney!.variants[0].steps[0].users, installs);
      assert.equal(slice.userJourney!.variants[0].conversions!.global.proceeds, proceeds);
      const comparison = slice.paywallCohortComparisons?.flows ?? slice.yearlyPriceComparison ?? slice.paywallFlowComparison!;
      const metric = comparison.rows[0].conversions!.global;
      assert.equal(metric.installs, installs);
      assert.equal(metric.proceeds, proceeds);
      assert.equal(metric.refunds, code === "US" ? 1 : 0);
      if (appId === "glow") {
        assert.equal(slice.paywallCohortComparisons!.prices.rows[0].conversions!.global.proceeds, proceeds);
        assert.equal(slice.paywallCohortComparisons!.flowPrices.rows[0].conversions!.global.proceeds, proceeds);
      }
      if (appId !== "poky") assert.equal(slice.trialCancelTiming!.trials, code === "US" ? 1 : 0);
    }
    assert.doesNotMatch(JSON.stringify(report), /appUserId|originalTransactionId|transactionId/);
    const html = renderToStaticMarkup(createElement(AppOverviewPanel, { appId, installs: 3, windowLabel: "Last 7 days",
      trend: [], countries: [], plans: [], retention: [], countryComparisons: report }));
    assert.match(html, /role="group" aria-label="Country"/);
    assert.match(html, /aria-pressed="true"[^>]*><span[^>]*>🌍<\/span>All countries/);
    assert.match(html, /United States/);
    assert.match(html, /Mexico/);
  });
}

test("Poky pools matching flows from different releases within each country", () => {
  const assignment = (experiment: string, allocation: string) => ({ poky_tracking_environment: "production",
    onboarding_offer_experiment: experiment, onboarding_offer_allocation: allocation,
    onboarding_offer_variant: "trial", onboarding_offer_assigned_at: String(start) });
  const report = buildAppCountryComparisons({ appId: "poky", asOf, journey: null,
    installs: [install("v1", "US", "1.1.5"), install("v2", "US", "1.1.10"), install("v3", "FR", "1.1.12")],
    attributes: new Map([
      ["v1", assignment("poky_onboarding_trial_v1", "50_50")],
      ["v2", assignment("poky_onboarding_trial_v2", "25_25_50")],
      ["v3", assignment("poky_onboarding_trial_v3", "25_25_25_25")],
    ]), events: [event("v1"), event("v3", { netProceeds: 100 })],
  });
  const us = report.slices.US.paywallFlowComparison!.rows[1].conversions!.global;
  assert.equal(us.installs, 2);
  assert.equal(us.proceeds, 30);
  assert.equal(report.slices.FR.paywallFlowComparison!.rows[1].installs, 1);
  assert.equal(report.slices.FR.paywallFlowComparison!.rows[1].conversions!.global.proceeds, 100);
});

test("journey country totals and first-version groups sum back to All countries", async () => {
  let sql = "";
  const rows = [
    { variant: "iam", version: "1.8.3", country: "US", key: ASSIGNED_KEY, users: 2 },
    { variant: "iam", version: "1.8.4", country: "US", key: ASSIGNED_KEY, users: 1 },
    { variant: "iam", version: "1.8.3", country: "MX", key: ASSIGNED_KEY, users: 4 },
    { variant: "iam", version: "1.8.3", country: "unknown", key: ASSIGNED_KEY, users: 1 },
  ];
  const report = await loadUserJourney(async <T,>(query: string): Promise<T[]> => { sql = query; return rows as T[]; },
    "glow", 54736, "1970-01-01 00:00:00", "2026-10-22 00:00:00", "1.8.3", true);
  assert.equal(report.variants[0].assigned, 8);
  assert.equal(report.countries!.US.variants[0].assigned, 3);
  assert.equal(report.countries!.MX.variants[0].assigned, 4);
  assert.equal(report.versions!.find((row) => row.version === "1.8.3")!.tracked, 7);
  assert.match(sql, /argMin\(upper\(ifNull\(nullIf\(JSONExtractString\(headers, 'Cf-Ipcountry'/);
  assert.match(sql, /GROUP BY variant, step, version, country/);
});
