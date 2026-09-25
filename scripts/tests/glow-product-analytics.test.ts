import assert from "node:assert/strict";
import test from "node:test";
import { cancellationJourneys, featureUsage, rate } from "../../lib/glow-product-analytics";

test("feature use counts unique people and per-user actions", () => {
  const rows = featureUsage([
    { event: "quote_viewed", users: 2, events: 9 },
    { event: "quote_swiped", users: 1, events: 4 },
  ]);
  assert.equal(rows[0].event, "quote_viewed");
  assert.equal(rows[0].eventsPerUser, 4.5);
  assert.equal(rows.find((row) => row.event === "quote_swiped")?.eventsPerUser, 4);
  assert.equal(rate(0, 0), null);
});

test("cancellation journey keeps only the seven days before cancellation", () => {
  const cancellations = [
    { distinctId: "superwall-id-a", timestamp: "2026-09-25T12:00:00Z", reason: "UNSUBSCRIBE" },
    { distinctId: "superwall-id-a", timestamp: "2026-09-24T12:00:00Z" },
    { distinctId: "superwall-id-b", timestamp: "2026-09-25T11:00:00Z" },
  ];
  const events = [
    { distinctId: "superwall-id-a", event: "quote_viewed", timestamp: "2026-09-20T10:00:00Z" },
    { distinctId: "superwall-id-a", event: "quote_viewed", timestamp: "2026-09-25T10:00:00Z" },
    { distinctId: "superwall-id-a", event: "screen_time", timestamp: "2026-09-25T10:30:00Z", screen: "home_feed" },
    { distinctId: "superwall-id-a", event: "sw_trial_start", timestamp: "2026-09-22T10:00:00Z" },
    { distinctId: "superwall-id-a", event: "quote_liked", timestamp: "2026-09-25T12:01:00Z" },
    { distinctId: "superwall-id-a", event: "quote_swiped", timestamp: "2026-09-17T10:00:00Z" },
    { distinctId: "superwall-id-c", event: "quote_viewed", timestamp: "2026-09-25T10:00:00Z" },
  ];
  const report = cancellationJourneys(cancellations, events, (id) => `masked:${id.at(-1)}`);
  assert.equal(report.recentCount, 2);
  assert.equal(report.matchedCount, 1);
  assert.equal(report.journeys[0].user, "masked:a");
  assert.equal(report.journeys[0].reason, "UNSUBSCRIBE");
  assert.equal(report.journeys[0].trialStartedAt, "2026-09-22T10:00:00Z");
  assert.deepEqual(report.journeys[0].activity, [{ event: "quote_viewed", label: "Quotes viewed", count: 2 }]);
  assert.equal(report.journeys[0].recentActions[0].label, "Screen: home feed");
  assert.equal(report.journeys[1].lastAppActivityAt, null);
  assert.equal(JSON.stringify(report).includes("superwall-id-a"), false);
});

test("paid cancellation journey labels paywall and practice activity", () => {
  const report = cancellationJourneys(
    [{ distinctId: "paid-user", timestamp: "2026-09-25T12:00:00Z", reason: "UNSUBSCRIBE" }],
    [
      { distinctId: "paid-user", event: "paywall_dismissed", timestamp: "2026-09-24T10:00:00Z" },
      { distinctId: "paid-user", event: "practice_session_ended", timestamp: "2026-09-25T09:00:00Z" },
    ],
    () => "masked",
  );
  assert.equal(report.matchedCount, 1);
  assert.deepEqual(report.journeys[0].recentActions.map((event) => event.label), ["Practice ended", "Paywall dismissed"]);
  assert.equal(report.journeys[0].trialStartedAt, null);
});
