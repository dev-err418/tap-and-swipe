import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import JournalPracticePanel from "../../components/analytics/JournalPracticePanel";
import { buildJournalPracticeReport, DAY_MS, JOURNAL_PRACTICE_ID, JOURNAL_PRACTICE_KEY, type JournalPracticeAttribute } from "../../lib/journal-practice-analytics";
import { loadJournalPractice } from "../../lib/journal-practice-queries";

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
  assert.match(html, /No production assignments/);
  assert.match(html, /not subscription retention/);
  assert.match(renderToStaticMarkup(createElement(JournalPracticePanel, { report: null })), /unavailable/);
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
