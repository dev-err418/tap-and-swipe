import assert from "node:assert/strict";
import test from "node:test";
import { paidSubscriptionActivity } from "../../lib/paid-subscription-activity";

const DAY = 86_400_000;
type Revenue = Parameters<typeof paidSubscriptionActivity>[0][number];
const charge = (appUserId: string, eventTs: number, expiresAt: number, transactionId: string,
  overrides: Partial<Revenue> = {}): Revenue => ({ appUserId, name: "initial_purchase", eventTs, expiresAt,
    netProceeds: 10, isRefund: false, originalTransactionId: appUserId, transactionId, ...overrides });
const session = (id: string, appUserId: string, day: number) => ({ id, appUserId, eventTs: day * DAY });

test("activity stops at cancellation and starts again on a later renewal", () => {
  const activity = paidSubscriptionActivity([
    charge("a", 0, 10 * DAY, "initial"),
    charge("a", 3 * DAY, 10 * DAY, "initial", { name: "cancellation", netProceeds: 0 }),
    charge("a", 10 * DAY, 20 * DAY, "renewal", { name: "renewal" }),
  ], [session("early", "a", 2), session("early", "a", 2), session("cancelled", "a", 5),
    session("renewed", "a", 12), session("expired", "a", 20)], 0, 25 * DAY);
  assert.deepEqual(activity.get("a"), { sessions: 2, sessionUserDays: 13 });
});

test("trial sessions are excluded until conversion and refund stops the paid interval", () => {
  const activity = paidSubscriptionActivity([
    charge("trial", 0, 3 * DAY, "trial", { netProceeds: 0 }),
    charge("trial", 3 * DAY, 10 * DAY, "paid", { name: "renewal" }),
    charge("trial", 7 * DAY, 10 * DAY, "paid", { name: "cancellation", netProceeds: -10, isRefund: true }),
  ], [session("free", "trial", 1), session("paid", "trial", 4), session("refunded", "trial", 8)], 0, 12 * DAY);
  assert.deepEqual(activity.get("trial"), { sessions: 1, sessionUserDays: 4 });
});

test("overlapping paid products do not double count user-days or sessions", () => {
  const activity = paidSubscriptionActivity([
    charge("a", 0, 10 * DAY, "yearly"),
    charge("a", 5 * DAY, 15 * DAY, "weekly", { originalTransactionId: "other" }),
  ], [session("open", "a", 8)], 0, 20 * DAY);
  assert.deepEqual(activity.get("a"), { sessions: 1, sessionUserDays: 15 });
});

test("cancellation can reference a subscription chain instead of the paid transaction", () => {
  const activity = paidSubscriptionActivity([
    charge("a", 0, 10 * DAY, "paid"),
    charge("a", 4 * DAY, 10 * DAY, "other", { name: "cancellation", netProceeds: 0 }),
  ], [session("before", "a", 2), session("after", "a", 5)], 0, 10 * DAY);
  assert.deepEqual(activity.get("a"), { sessions: 1, sessionUserDays: 4 });
});
