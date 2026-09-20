import assert from "node:assert/strict";
import test from "node:test";
import { appAnalyticsBucketSql, appAnalyticsPeriodRange, appAnalyticsTrendBucket, parisDatetimeLocalValue, parisDatetimeToDate } from "../../lib/app-analytics-time";

test("Paris note times round-trip in winter and summer, independently of browser/server timezone", () => {
  for (const [instant, local] of [["2026-01-15T23:30:00Z", "2026-01-16T00:30"], ["2026-09-19T22:30:00Z", "2026-09-20T00:30"]]) {
    assert.equal(parisDatetimeLocalValue(new Date(instant)), local);
    assert.equal(parisDatetimeToDate(local).toISOString(), new Date(instant).toISOString());
  }
});

test("Today begins at Paris midnight, not UTC midnight", () => {
  const result = appAnalyticsPeriodRange("day", new Date("2026-09-19T22:30:00Z"));
  assert.equal(result.since.toISOString(), "2026-09-19T22:00:00.000Z");
  assert.equal(result.before.toISOString(), "2026-09-19T22:30:00.000Z");
});

test("Yesterday contains 23 or 25 hours across daylight-saving transitions", () => {
  const spring = appAnalyticsPeriodRange("yesterday", new Date("2026-03-30T12:00:00Z"));
  const autumn = appAnalyticsPeriodRange("yesterday", new Date("2026-10-26T12:00:00Z"));
  assert.equal((spring.before.getTime() - spring.since.getTime()) / 3600000, 23);
  assert.equal((autumn.before.getTime() - autumn.since.getTime()) / 3600000, 25);
  assert.equal(spring.since.toISOString(), "2026-03-28T23:00:00.000Z");
  assert.equal(autumn.since.toISOString(), "2026-10-24T22:00:00.000Z");
});

test("nonexistent spring-forward note times are rejected, not silently moved", () => {
  assert.throws(() => parisDatetimeToDate("2026-03-29T02:30"), /does not exist/);
  assert.throws(() => parisDatetimeToDate("2026-02-30T12:00"));
});

test("editing a repeated autumn hour preserves its existing UTC instant", () => {
  assert.equal(parisDatetimeToDate("2026-10-25T02:30").toISOString(), "2026-10-25T00:30:00.000Z");
  assert.equal(parisDatetimeToDate("2026-10-25T02:30", "2026-10-25T01:30:15Z").toISOString(), "2026-10-25T01:30:15.000Z");
});

test("daily and four-hour paid buckets match Paris wall-clock boundaries", () => {
  for (const [instant, expected] of [
    ["2026-09-20T05:30:00Z", "2026-09-20T02:00:00.000Z"],
    ["2026-01-20T05:30:00Z", "2026-01-20T03:00:00.000Z"],
    ["2026-03-29T02:30:00Z", "2026-03-29T02:00:00.000Z"],
    ["2026-10-25T03:30:00Z", "2026-10-25T03:00:00.000Z"],
  ]) assert.equal(appAnalyticsTrendBucket(new Date(instant), "week").toISOString(), expected);
  assert.equal(appAnalyticsTrendBucket(new Date("2026-09-19T22:30:00Z"), "month").toISOString(), "2026-09-19T22:00:00.000Z");
});

test("the two repeated autumn hours remain distinct chart buckets", () => {
  for (const hour of ["00", "01"]) assert.equal(appAnalyticsTrendBucket(new Date(`2026-10-25T${hour}:30:00Z`), "day").toISOString(), `2026-10-25T${hour}:00:00.000Z`);
});

test("SQL groups calendar buckets in Paris while serializing timestamps as UTC", () => {
  for (const period of ["week", "month", "all"] as const) {
    assert.match(appAnalyticsBucketSql(period), /Europe\/Paris/);
    assert.match(appAnalyticsBucketSql(period), /'UTC'\)$/);
  }
  assert.equal(appAnalyticsBucketSql("day"), "toStartOfHour(toTimeZone(ts, 'UTC'))");
});
