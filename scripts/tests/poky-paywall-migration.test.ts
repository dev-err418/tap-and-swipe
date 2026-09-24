import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppExperimentCard from "../../components/analytics/AppExperimentCard";
import { POKY_PAYWALL_ENGINE_ATTRIBUTE, POKY_PAYWALL_ENGINE_START_MS as START, pokyPaywallMigrationExperiment } from "../../lib/poky-paywall-migration";

const DAY = 86_400_000;
const assignment = (variant: "superwall" | "native", assignedAt = START + 1000, language = "en", environment = "production") => JSON.stringify({
  schema: 1, experiment: "poky_paywall_engine_v1", variant, assignedAt, language, environment,
});
const install = (appUserId: string, country = "US", installedAt = START - 60 * DAY) => ({ appUserId, country, installedAt });
const event = (appUserId: string, originalTransactionId: string, transactionId: string, name: string, netProceeds: number, eventTs = START + 2000, isRefund = false) => ({
  appUserId, originalTransactionId, transactionId, name, netProceeds, eventTs, attributionTs: eventTs + 1, isRefund,
});
function facts(attrs: [string, string][], events: ReturnType<typeof event>[] = [], startMs = START - DAY, endMs = START + 10 * DAY) {
  return { startMs, endMs, installs: attrs.map(([id]) => install(id)), events, attributes: new Map(attrs.map(([id, value]) => [id, { [POKY_PAYWALL_ENGINE_ATTRIBUTE]: value }])) };
}

test("new assignment, not install version, determines arm and old conversions never enter", () => {
  const input = facts([
    ["old-user", assignment("superwall")],
    ["native-user", assignment("native", START + 1000, "fr")],
    ["past", assignment("superwall", START - 1)],
    ["sandbox", assignment("native", START + 1000, "en", "sandbox")],
  ], [
    event("old-user", "legacy", "legacy", "initial_purchase", 60, START - DAY),
    event("old-user", "legacy", "legacy-renewal", "renewal", 20, START + 3000),
    event("old-user", "fresh", "fresh", "initial_purchase", 40),
    event("native-user", "native", "native", "initial_purchase", 30),
    event("past", "past", "past", "initial_purchase", 100),
    event("sandbox", "sandbox", "sandbox", "initial_purchase", 100),
  ]);
  const report = pokyPaywallMigrationExperiment(input, START + DAY);
  assert.equal(report.variants[0].users, 1);
  assert.equal(report.variants[0].paid, 1);
  assert.equal(report.variants[0].proceeds, 40);
  assert.equal(report.variants[1].users, 1);
  assert.equal(report.variants[1].proceeds, 30);
  assert.equal(report.languageComparisons?.find((row) => row.language === "fr")?.variants[1].proceeds, 30);
  assert.equal(report.languageVariants?.fr?.[1].proceeds, 30);
  assert.equal(report.randomized, true);
});

test("trial renewal and refund follow a new original purchase, with one paid user", () => {
  const input = facts([["payer", assignment("superwall")], ["nonpayer", assignment("superwall")]], [
    event("payer", "new", "new", "initial_purchase", 0),
    event("payer", "new", "renewal", "renewal", 20, START + 3 * DAY),
    event("payer", "new", "renewal", "renewal", 20, START + 3 * DAY),
    event("payer", "new", "refund", "refund", -5, START + 4 * DAY, true),
    event("payer", "old", "old-renewal", "renewal", 99, START + 5 * DAY),
  ]);
  const report = pokyPaywallMigrationExperiment(input, START + 7 * DAY);
  assert.equal(report.variants[0].users, 2);
  assert.equal(report.variants[0].paid, 1);
  assert.equal(report.variants[0].proceeds, 15);
});

test("date picker filters assignment cohort while following eligible revenue to date", () => {
  const input = facts([
    ["one", assignment("native", START + 1000)],
    ["two", assignment("native", START + 2 * DAY)],
  ], [
    event("one", "one", "one", "initial_purchase", 10),
    event("one", "one", "later", "renewal", 5, START + 5 * DAY),
    event("two", "two", "two", "initial_purchase", 100, START + 3 * DAY),
  ], START, START + DAY);
  const report = pokyPaywallMigrationExperiment(input, START + 6 * DAY);
  assert.equal(report.variants[1].users, 1);
  assert.equal(report.variants[1].proceeds, 15);
});

test("malformed, future and missing assignments are excluded; card labels the assigned cohort", () => {
  const input = facts([
    ["good", assignment("native")],
    ["future", assignment("native", START + 5 * DAY)],
    ["bad", "not-json"],
  ]);
  const report = pokyPaywallMigrationExperiment(input, START + DAY);
  assert.equal(report.variants[1].users, 1);
  const markup = renderToStaticMarkup(createElement(AppExperimentCard, { experiment: report, topCountries: [] }));
  assert.match(markup, /Assigned → paid/);
  assert.match(markup, /French APPU/);
  assert.doesNotMatch(markup, /Historical cohorts/);
  assert.doesNotMatch(markup, /<th[^>]*>Installs<\/th>/);
});
