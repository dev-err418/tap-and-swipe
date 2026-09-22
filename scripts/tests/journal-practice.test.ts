import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import JournalPracticePanel from "../../components/analytics/JournalPracticePanel";
import AppExperimentCard from "../../components/analytics/AppExperimentCard";
import { buildJournalPracticeReport, DAY_MS, JOURNAL_PRACTICE_ID, JOURNAL_PRACTICE_KEY, type JournalPracticeAttribute } from "../../lib/journal-practice-analytics";
import { loadJournalPractice } from "../../lib/journal-practice-queries";
import { journalPracticeComparisons } from "../../lib/journal-practice-comparison";

const start = Date.UTC(2026, 8, 1);
function attribute(id: string, overrides: Record<string, unknown> = {}): JournalPracticeAttribute {
  return { appUserId: id, key: JOURNAL_PRACTICE_KEY, value: JSON.stringify({
    schema: 1, experiment: JOURNAL_PRACTICE_ID, environment: "production", variant: "journal",
    assignedAt: start, updatedAt: start, language: "en", randomized: true,
    days: { "0": { sessions: 1, opens: 0, active: true } }, ...overrides,
  }) };
}

test("return retention includes non-returners and waits for the complete day window", () => {
  const data = [attribute("returns", { updatedAt: start + 7 * DAY_MS,
    days: { "0": { sessions: 1, opens: 0, active: true }, "7": { sessions: 1, opens: 0, active: true } } }), attribute("does-not-return")];
  const before = buildJournalPracticeReport(data, start, start + 1, start + 8 * DAY_MS - 1);
  assert.equal(before.rows[0].d7.rate, null);
  const after = buildJournalPracticeReport(data, start, start + 1, start + 8 * DAY_MS);
  assert.deepEqual(after.rows[0].d7, { eligible: 2, retained: 1, rate: 0.5 });
  assert.equal(after.rows[0].sessionsPerUserDayD7, 1 / 7); // day 7 isn't in the first 7 days
  assert.equal(after.rows[1].sessionsPerUserDayD7, null);
});

test("D1 and D30 use exact elapsed windows and no unobserved zero rates", () => {
  const data = [attribute("a", { updatedAt: start + 30 * DAY_MS, days: {
    "0": { sessions: 1, opens: 0, active: true }, "1": { sessions: 0, opens: 0, active: true },
    "30": { sessions: 1, opens: 0, active: true },
  } })];
  assert.equal(buildJournalPracticeReport(data, start, start + 1, start + 31 * DAY_MS).rows[0].d30.rate, 1);
  assert.equal(buildJournalPracticeReport([attribute("a")], start, start + 1, start + 2 * DAY_MS - 1).rows[0].d1.rate, null);
  assert.equal(buildJournalPracticeReport([attribute("a")], start, start + 1, start + 2 * DAY_MS).rows[0].d1.rate, 0);
});

test("sessions use equal 7-day windows with zeros, excluding immature users", () => {
  const report = buildJournalPracticeReport([
    attribute("a", { days: { "0": { sessions: 7, opens: 1, active: true } } }),
    attribute("b"), attribute("young", { assignedAt: start + DAY_MS, updatedAt: start + DAY_MS }),
  ], start, start + 2 * DAY_MS, start + 7 * DAY_MS);
  assert.equal(report.rows[0].users, 3);
  assert.equal(report.rows[0].sessionUsersD7, 2);
  assert.equal(report.rows[0].sessionsPerUserDayD7, 8 / 14);
  assert.ok(Math.abs(report.rows[0].sessionsPerUserDayVarianceD7! - 18 / 49) < 1e-10);
  assert.equal(report.rows[1].sessionsPerUserDayVarianceD7, null);
});

test("only production randomized assignments in the selected cohort count", () => {
  const report = buildJournalPracticeReport([
    attribute("a"), attribute("a"), attribute("debug", { environment: "development" }),
    attribute("sandbox", { environment: "sandbox" }), attribute("forced", { randomized: false }),
    attribute("old", { assignedAt: start - 1 }), attribute("end", { assignedAt: start + 1, updatedAt: start + 1 }),
  ], start, start + 1, start + 8 * DAY_MS);
  assert.equal(report.rows[0].users, 1);
});

test("malformed, future and conflicting records are excluded with a warning", () => {
  const report = buildJournalPracticeReport([
    attribute("conflict"), attribute("conflict", { variant: "practice" }),
    attribute("future", { updatedAt: start + 9 * DAY_MS }),
    attribute("invalid-day", { days: { "32": { active: true, sessions: 1, opens: 0 } } }),
    { appUserId: "broken", key: JOURNAL_PRACTICE_KEY, value: "{" },
  ], start, start + 1, start + 8 * DAY_MS);
  assert.equal(report.status, "empty");
  assert.equal(report.rows[0].users, 0);
  assert.match(report.warnings[0], /4 invalid/);
});

test("query filters sandbox and deletion and surfaces failures, never partial zeros", async () => {
  let sql = "";
  const report = await loadJournalPractice(async <T,>(query: string) => { sql = query; return [] as T[]; }, 54736, start, start + 1);
  assert.equal(report.status, "empty");
  assert.match(sql, /applicationId = 54736 AND isSandbox = 0 AND isDeleted = 0/);
  assert.match(sql, /user_attributes_rep FINAL/);
  const failed = await loadJournalPractice(async () => { throw new Error("offline"); }, 54736, start, start + 1);
  assert.equal(failed.status, "unavailable");
  assert.deepEqual(failed.rows, []);
});

test("dashboard distinguishes no data and failures and labels app-return metrics", () => {
  const report = buildJournalPracticeReport([], start, start + 1, start + 8 * DAY_MS);
  const html = renderToStaticMarkup(createElement(JournalPracticePanel, { report }));
  assert.match(html, /Journal VS Practice/);
  assert.match(html, /30% Journal · 70% Practice/);
  assert.match(html, /No production assignments/);
  assert.doesNotMatch(html, /enrollment stays off/);
  assert.match(html, /D1 return/);
  assert.match(html, /D7 return/);
  assert.doesNotMatch(html, /D30 return/);
  assert.match(renderToStaticMarkup(createElement(JournalPracticePanel, { report: null })), /unavailable/);
});

test("activity tests share the regular A/B comparison charts and table without inventing revenue or immature winners", () => {
  const report = buildJournalPracticeReport([attribute("a")], start, start + 1, start + 8 * DAY_MS);
  const html = renderToStaticMarkup(createElement(JournalPracticePanel, { report })).replaceAll(/<!--.*?-->/g, "");
  const regular = renderToStaticMarkup(createElement(AppExperimentCard, {
    experiment: { id: "reference", title: "Reference", subtitle: "50/50", variants: [], scoreMetrics: [] },
  }));
  for (const className of ["h-[46px]", "text-xs font-semibold text-black", "w-max min-w-full text-sm", "border-b border-black/10 text-left text-xs text-black/50"]) {
    assert.ok(html.includes(className));
    assert.ok(regular.includes(className));
  }
  assert.match(html, /Variant A/);
  assert.match(html, /Variant B/);
  assert.match(html, /text-right font-mono tabular-nums/);
  assert.match(html, /0\.0%/); // Mature observed non-return is a true zero.
  assert.match(html, /—/); // Immature/unobserved data is still missing, not zero.
  assert.match(html, /0\.14/);
  assert.match(html, /chance to win/);
  assert.match(html, /Planning pending/);
  assert.doesNotMatch(html, /Proceeds|100%.*?chance to win|text-lg font-semibold/);
});

test("unavailable activity data never renders stale metrics", () => {
  const populated = buildJournalPracticeReport([attribute("a")], start, start + 1, start + 8 * DAY_MS);
  const html = renderToStaticMarkup(createElement(JournalPracticePanel, {
    report: { ...populated, status: "unavailable", warnings: ["Example reporting warning"] },
  }));
  assert.match(html, /unavailable/);
  assert.doesNotMatch(html, /<table/);
  assert.doesNotMatch(html, /chance to win/);
});

test("comparison charts use mature return denominators and per-user session variance", () => {
  const attributes = ["journal", "practice"].flatMap((variant) => Array.from({ length: 100 }, (_, index) => attribute(`${variant}-${index}`, {
    variant, updatedAt: start + DAY_MS,
    days: { "0": { sessions: index % 2 ? 7 : 1, opens: 0, active: true },
      ...(index < (variant === "journal" ? 30 : 50) ? { "1": { sessions: 1, opens: 0, active: true } } : {}),
    },
  })));
  const report = buildJournalPracticeReport(attributes, start, start + 1, start + 8 * DAY_MS);
  const comparisons = journalPracticeComparisons(report);
  assert.deepEqual(comparisons[0].analysis.variants.map((row) => row.metricValue), [0.3, 0.5]);
  assert.ok(comparisons[0].analysis.variants[1].chanceToWin! > 0.95);
  assert.ok(comparisons[2].analysis.sufficientData);
  assert.ok(Math.abs(comparisons[2].analysis.variants[0].metricValue - report.rows[0].sessionsPerUserDayD7!) < 1e-10);
  assert.deepEqual(comparisons.map((row) => row.title), ["D1 return", "D7 return", "Sessions / user / day"]);
  const flagged = journalPracticeComparisons({ ...report, warnings: ["Malformed records"] });
  assert.ok(flagged.every(({ analysis }) => analysis.variants.every((row) => row.chanceToWin === null)));
});

test("a failed second page never returns the first page as a complete cohort", async () => {
  let calls = 0;
  const report = await loadJournalPractice(async <T,>(sql: string) => {
    calls++;
    if (calls === 1) return Array.from({ length: 10000 }, (_, i) => attribute(`user-${String(i).padStart(5, "0")}`)) as T[];
    assert.match(sql, /appUserId > 'user-09999'/);
    throw new Error("second page unavailable");
  }, 54736, start, start + 1);
  assert.equal(calls, 2);
  assert.equal(report.status, "unavailable");
  assert.deepEqual(report.rows, []);
});

test("double-encoded scalar JSON is accepted and unexpected schema is rejected", () => {
  const a = attribute("valid");
  a.value = JSON.stringify(a.value);
  const report = buildJournalPracticeReport([a, attribute("invalid", { schema: 2 })], start, start + 1, start + 8 * DAY_MS);
  assert.equal(report.rows[0].users, 1);
  assert.equal(report.warnings.length, 1);
});
