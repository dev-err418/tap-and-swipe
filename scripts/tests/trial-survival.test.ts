import assert from "node:assert/strict";
import test from "node:test";
import { sevenDayTrialSurvival } from "../../lib/trial-survival";

const DAY = 86_400_000;
const start = DAY;
function trial(id: string, days: number) {
  return { originalTransactionId: id, name: "initial_purchase", periodType: "trial",
    eventTs: start, expiresAt: start + days * DAY, isRefund: false };
}

test("only original seven-day trials enter the denominator and cancellation buckets", () => {
  const seven = trial("seven", 7);
  const three = trial("three", 3);
  const unknown = trial("unknown", NaN);
  const result = sevenDayTrialSurvival([seven, seven, three, unknown,
    { ...three, name: "renewal", expiresAt: start + 7 * DAY },
    { ...three, name: "cancellation", eventTs: start + DAY },
    { ...seven, name: "cancellation", eventTs: start + 6.5 * DAY },
  ], 0, 2 * DAY, 10 * DAY);
  assert.equal(result.trials, 1);
  assert.equal(result.cancelled, 1);
  assert.equal(result.buckets.at(-1)?.cancels, 1);
  assert.equal(result.buckets.at(-1)?.key, "6-7d");
});

test("qualification and seven-day boundaries agree with the plotted buckets", () => {
  const immediate = trial("immediate", 7);
  const qualified = trial("qualified", 7);
  const late = trial("late", 7);
  const result = sevenDayTrialSurvival([immediate, qualified, late,
    { ...immediate, name: "cancellation" },
    { ...qualified, name: "cancellation", eventTs: start + 15 * 60_000 },
    { ...late, name: "cancellation", eventTs: start + 7 * DAY },
  ], 0, 2 * DAY, 10 * DAY);
  assert.equal(result.trials, 3);
  assert.equal(result.cancelled, 2);
  assert.equal(result.cancelledBeforeQualified, 2);
  assert.equal(result.buckets.slice(0, 3).reduce((sum, bucket) => sum + bucket.cancels, 0), 2);
});

test("respects start window and report time, counting each chain's first cancellation", () => {
  const seven = trial("seven", 7);
  const result = sevenDayTrialSurvival([seven,
    { ...seven, name: "cancellation", eventTs: start + 4 * DAY },
    { ...seven, name: "cancellation", eventTs: start + 5 * DAY },
    { ...trial("future", 7), eventTs: 20 * DAY },
    { ...trial("outside", 7), eventTs: 0, expiresAt: 7 * DAY },
  ], start, 2 * DAY, start + 4.5 * DAY);
  assert.equal(result.trials, 1);
  assert.equal(result.cancelled, 1);
  assert.equal(result.buckets.find((bucket) => bucket.key === "3-4d")?.cancels, 1);
  assert.equal(sevenDayTrialSurvival([seven], start, start, 10 * DAY).trials, 0);
});
