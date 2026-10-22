import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { experimentCohortLabel, experimentInstallCohort, experimentInstallUsersSql, experimentMinimumInstallVersion, installVersionAtLeast } from "../../lib/app-experiment-cohort";
import { loadNativePaywalls } from "../../lib/native-paywall-queries";
import { loadGlowOnboardingExperience } from "../../lib/glow-onboarding-experience-queries";
import { loadUserJourney } from "../../lib/user-journey-queries";
import { buildUserJourney, userJourneyDefinition } from "../../lib/user-journey";
import { withJourneyConversions } from "../../lib/journey-cohort-conversions";
import UserJourneyFunnel from "../../components/analytics/UserJourneyFunnel";

const now = Date.parse("2026-10-22T12:00:00Z");
const day = 86_400_000;

test("comparison cohorts use the configured minimum first-install version, including future releases", () => {
  assert.equal(experimentMinimumInstallVersion("glow"), "1.8.3");
  assert.equal(experimentMinimumInstallVersion("versy"), "1.2.6");
  assert.equal(experimentMinimumInstallVersion("poky"), "1.1.5");
  assert.equal(experimentCohortLabel("poky"), "Installed on v1.1.5+");
  for (const version of ["1.8.3", "1.8.3.0", "1.8.10", "1.9", "2.0"]) assert.equal(installVersionAtLeast(version, "1.8.3"), true, version);
  for (const version of ["1.8.2", "1.7.99", "", "unknown", "2.beta", "1.8.3-debug"]) assert.equal(installVersionAtLeast(version, "1.8.3"), false, version);
  assert.equal(experimentCohortLabel("versy"), "Installed on v1.2.6+");
});

for (const appId of ["glow", "versy", "poky"] as const) {
  test(`${appId} includes qualifying installs older than seven days and never enrolls an upgraded legacy install`, () => {
    const minimum = experimentMinimumInstallVersion(appId)!;
    const install = (appUserId: string, appVersion: string, installedAt: number) => ({ appUserId, appVersion, installedAt });
    const installs = experimentInstallCohort([
      install("payer", minimum, now - 40 * day), install("free", minimum, now - 30 * day),
      install("legacy", "1.0.0", now - 50 * day), install("legacy", minimum, now - day),
      install("unknown", "", now - day), install("future", minimum, now + day),
    ], minimum, now);
    assert.deepEqual(installs.map((row) => row.appUserId), ["payer", "free"]);
    const definition = userJourneyDefinition(appId)!;
    const attributes = new Map(installs.map((row) => [row.appUserId, {
      ...definition.cohortAttributes, [definition.variantAttribute]: definition.variants[0].key,
    }]));
    const charge = { appUserId: "payer", originalTransactionId: "subscription", transactionId: "charge", name: "initial_purchase", periodType: "normal",
      isRefund: false, netProceeds: 10, eventTs: now - 39 * day, attributionTs: now - 39 * day, expiresAt: 0 };
    const report = withJourneyConversions(buildUserJourney(definition, []), appId, installs, [
      charge, { ...charge, name: "cancellation", isRefund: true, netProceeds: -2, eventTs: now - day, attributionTs: now - day },
    ], attributes, 0, now, now);
    assert.equal(report.variants[0].conversions!.global.installs, 2);
    assert.equal(report.variants[0].conversions!.global.proceeds / 2, 4);
    assert.equal(report.variants[0].conversions!.global.refunds, 1);
    const markup = renderToStaticMarkup(createElement(UserJourneyFunnel, { report, appId, windowLabel: "Last 7 days", funnelOnly: true }));
    assert.ok(markup.includes(experimentCohortLabel(appId)!));
    assert.doesNotMatch(markup, /Last 7 days|All time|All languages and countries/);
  });
}

test("native and onboarding queries filter first install versions before constructing assignment denominators", async () => {
  for (const [applicationId, minimum] of [[54736, "1.8.3"], [51393, "1.2.6"], [49771, "1.1.5"]] as const) {
    const expectedSql = experimentInstallUsersSql(applicationId, minimum);
    assert.match(expectedSql, /argMin\(JSONExtractString\(meta, 'appVersion'\), ts\)/);
    assert.match(expectedSql, /isSandbox = 0/);
    assert.doesNotMatch(expectedSql, /argMax|ts >=/);
    const queries: string[] = [];
    await loadNativePaywalls(async <T,>(sql: string): Promise<T[]> => { queries.push(sql); return []; }, applicationId, 0, now, minimum);
    assert.ok(queries[0].includes(`appUserId IN (${expectedSql})`));
  }
  const queries: string[] = [];
  await loadGlowOnboardingExperience(async <T,>(sql: string): Promise<T[]> => { queries.push(sql); return []; }, 54736, 0, now, "1.8.3");
  assert.ok(queries[0].includes(experimentInstallUsersSql(54736, "1.8.3")));
});

test("journey SQL uses the same all-time minimum install cohort as its outcome metrics", async () => {
  for (const appId of ["glow", "versy", "poky"] as const) {
    let sql = "";
    const minimum = experimentMinimumInstallVersion(appId)!;
    await loadUserJourney(async <T,>(query: string): Promise<T[]> => { sql = query; return []; }, appId,
      appId === "glow" ? 54736 : appId === "poky" ? 49771 : 51393, "1970-01-01 00:00:00", "2026-10-22 12:00:00", minimum);
    assert.match(sql, new RegExp(`tuple\\(${minimum.split(".").join(", ")}, 0\\)`));
    assert.match(sql, /firstInstallDate >= toDateTime64\('1970-01-01 00:00:00'/);
    assert.match(sql, /match\(version,/);
    assert.doesNotMatch(sql, /argMax/);
  }
});
