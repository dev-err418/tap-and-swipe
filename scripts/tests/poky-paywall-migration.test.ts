import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppExperimentCard from "../../components/analytics/AppExperimentCard";
import { pokyComparisonLanguage, pokyPaywallEngine, pokyPaywallMigrationExperiment } from "../../lib/poky-paywall-migration";

const DAY = 86400000;
const start = Date.parse("2026-09-01T00:00:00Z");
const install = (appUserId: string, language = "en", appVersion = "1.1.2", country = "US") => ({ appUserId, language, appVersion, country, installedAt: start });
const event = (appUserId: string, netProceeds: number, day = 1, transactionId = appUserId, name = "initial_purchase") => ({ appUserId, netProceeds, eventTs: start + day * DAY, name, transactionId, originalTransactionId: appUserId, attributionTs: start + day * DAY });
const facts = (installs: ReturnType<typeof install>[], events: ReturnType<typeof event>[] = []) => ({ installs, events, startMs: start, endMs: start + DAY, attributes: new Map<string, Record<string, string>>() });

test("native starts at 1.1.2; semantic versions and unknown values are handled safely", () => {
  assert.equal(pokyPaywallEngine("1.1.1"), "legacy");
  assert.equal(pokyPaywallEngine("1.1"), "legacy");
  assert.equal(pokyPaywallEngine("1.1.2"), "native");
  assert.equal(pokyPaywallEngine("1.1.10"), "native");
  assert.equal(pokyPaywallEngine("2.0.0"), "native");
  assert.equal(pokyPaywallEngine(""), null);
  assert.equal(pokyPaywallEngine("unknown"), null);
});

test("Spanish is a language, not Spain; English includes known unsupported-language fallback", () => {
  assert.equal(pokyComparisonLanguage("es-MX"), "es");
  assert.equal(pokyComparisonLanguage("EN_us"), "en");
  assert.equal(pokyComparisonLanguage("it-IT"), "en");
  for (const locale of ["", "unknown", "und", "de-DE", "fr-FR"]) assert.equal(pokyComparisonLanguage(locale), null);
});

test("APPU uses all cohort installs and total proceeds, including later renewals and refunds", () => {
  const report = pokyPaywallMigrationExperiment(facts(
    [install("es1", "es-MX", "1.1.1", "MX"), install("es2", "es", "1.1.1", "US"), install("en1", "en", "1.1.2", "ES"), install("en2")],
    [event("es1", 20), event("es1", 20), event("es1", 10, 8, "renewal", "renewal"), event("es1", -5, 9, "renewal", "cancellation"), event("en1", 60), event("en1", 20, 2, "second-subscription"), event("en1", 500, 99)]
  ), start + 10 * DAY);
  const [es, en] = report.languageComparisons!;
  assert.equal(es.variants[0].installs, 2);
  assert.equal(es.variants[0].proceeds, 25);
  assert.equal(es.variants[0].paid, 1);
  assert.equal(es.variants[0].countries.MX.proceeds, 25);
  assert.equal(en.variants[1].proceeds / en.variants[1].installs, 40);
  assert.equal(en.variants[1].paid, 1); // Paying users, not transactions/subscriptions.
  assert.equal(report.variants[1].countries.ES.proceeds, 80); // English speaker in Spain.
});

test("upgrades stay in their install cohort; missing, unrelated, debug and out-of-cohort data are excluded", () => {
  const input = facts([
    install("old", "en", "1.1.1"), { ...install("old"), installedAt: start + 1 },
    install("german", "de"), install("unknown", ""), install("bad-version", "en", ""), install("debug"),
    { ...install("outside"), installedAt: start - DAY },
  ], [event("old", 30), event("german", 90), event("missing-install", 80), event("old", 10, -1)]);
  input.attributes.set("debug", { poky_tracking_environment: "sandbox" });
  const result = pokyPaywallMigrationExperiment(input, start + 10 * DAY);
  assert.equal(result.variants[0].installs, 1);
  assert.equal(result.variants[0].proceeds, 30);
  assert.equal(result.variants[1].installs, 0);
});

test("one comparison card renders both language APPUs and an empty arm honestly", () => {
  const result = pokyPaywallMigrationExperiment(facts([install("a", "es", "1.1.1")], [event("a", 20)]), start + 3 * DAY);
  const markup = renderToStaticMarkup(createElement(AppExperimentCard, { experiment: result, topCountries: ["US"] }));
  assert.match(markup, /Spanish total APPU/);
  assert.match(markup, /English total APPU/);
  assert.match(markup, /Superwall vs native/);
  assert.match(markup, /historical cohorts, not randomized/);
  assert.match(markup, /—/);
});
