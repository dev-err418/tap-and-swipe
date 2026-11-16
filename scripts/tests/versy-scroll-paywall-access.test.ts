import assert from "node:assert/strict";
import test from "node:test";
import { buildVersyScrollAccessComparison, parseVersyScrollAccess, VERSY_SCROLL_ACCESS_ATTRIBUTE,
  VERSY_SCROLL_ACCESS_EXPERIMENT, VERSY_SCROLL_ONBOARDING_EXPERIMENT } from "../../lib/versy-scroll-paywall-access";

const day = 86_400_000, start = Date.parse("2026-11-16T00:00:00Z"), asOf = start + 10 * day;
const attrs = (access = "hard", extra = {}) => ({ versy_tracking_environment: "production",
  onboarding_experiment_id: VERSY_SCROLL_ONBOARDING_EXPERIMENT, onboarding_variant: "scroll_the_bible",
  [VERSY_SCROLL_ACCESS_ATTRIBUTE]: JSON.stringify({ schema: 1, experiment: VERSY_SCROLL_ACCESS_EXPERIMENT,
    environment: "production", flow: "scroll_the_bible", access, assignedAt: start,
    yearlyProduct: "com.arthurbuildsstuff.bible.yearly_4999", ...extra }),
});
const install = (appUserId: string) => ({ appUserId, appVersion: "1.3.4", installedAt: start });
type Event = Parameters<typeof buildVersyScrollAccessComparison>[1][number];
const event = (appUserId: string, extra: Partial<Event> = {}): Event => ({ appUserId,
  originalTransactionId: appUserId, transactionId: appUserId, name: "initial_purchase", periodType: "normal",
  netProceeds: 20, isRefund: false, eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...extra });

test("mature proceeds include non-payers, exclude running and late trials, and follow identity-free refunds", () => {
  const attributes = new Map([
    ["paid", attrs()], ["free", attrs()], ["late-trial", attrs()], ["soft", attrs("dismissible")],
  ]);
  const report = buildVersyScrollAccessComparison([...attributes.keys()].map(install), [
    event("paid", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
    event("", { originalTransactionId: "paid", transactionId: "paid-renewal", name: "renewal", eventTs: start + 8 * day }),
    event("", { originalTransactionId: "paid", transactionId: "paid-refund", name: "cancellation", isRefund: true,
      netProceeds: -5, eventTs: start + 9 * day }),
    event("late-trial", { periodType: "trial", netProceeds: 0, eventTs: start + 5 * day, expiresAt: start + 12 * day }),
    event("soft"),
  ], attributes, asOf);
  assert.deepEqual(report.overall.rows[0].conversions!.global.realizedAppu, { users: 2, proceeds: 15, missingMoney: false });
  assert.deepEqual(report.overall.rows[1].conversions!.global.realizedAppu, { users: 1, proceeds: 20, missingMoney: false });
  assert.equal(report.flows.rows[0].installs, 3);
  const early = buildVersyScrollAccessComparison([...attributes.keys()].map(install), [], attributes, start + day);
  assert.equal(early.overall.rows[0].conversions!.global.realizedAppu!.users, 0);
});

test("only explicit valid production v3 enrollment enters access results", () => {
  assert.ok(parseVersyScrollAccess(attrs(), asOf));
  for (const invalid of [
    { ...attrs(), onboarding_experiment_id: "scroll_the_bible_v2" },
    { ...attrs(), versy_tracking_environment: "development" },
    { ...attrs(), onboarding_variant: "scroll_the_bible_videos" },
    attrs("hard", { assignedAt: asOf + day }), attrs("hard", { environment: "development" }),
    attrs("hard", { flow: "bible_widget" }), attrs("invalid"),
    { ...attrs(), [VERSY_SCROLL_ACCESS_ATTRIBUTE]: "{" },
  ]) assert.equal(parseVersyScrollAccess(invalid, asOf), null);
});
