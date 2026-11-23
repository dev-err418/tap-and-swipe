import assert from "node:assert/strict";
import test from "node:test";
import { buildVersyAndroidJourney } from "../../lib/versy-android-journey";
import { platformAnalyticsStorageKey, versyAnalyticsPlatform, versyClientEvents, versyStoreEvents } from "../../lib/versy-analytics-platform";
import { VERSY_ANDROID_FLOW_ATTRIBUTE, VERSY_ANDROID_FLOW_EXPERIMENT, VERSY_ANDROID_NOTE_ATTRIBUTE, VERSY_ANDROID_NOTE_EXPERIMENT,
  VERSY_ANDROID_RECOVERY_EXPERIMENT, VERSY_ANDROID_RECOVERY_PRICES, VERSY_ANDROID_YEARLY_EXPERIMENT, VERSY_ANDROID_YEARLY_PRICES } from "../../lib/versy-android-experiments";
import { buildVersyNoteReport, VERSY_NOTE_ATTRIBUTE } from "../../lib/versy-paywall-note";
import { buildVersyYearlyPriceComparison, VERSY_PRICE_TEST_START } from "../../lib/versy-yearly-price-cohorts";
import { versyOfferRows } from "../../lib/versy-offer-breakdown";

const assignedAt = VERSY_PRICE_TEST_START + 3_600_000;
const asOf = assignedAt + 7 * 86_400_000;
const install = { appUserId: "verified", installedAt: assignedAt - 5_000, appVersion: "2.0.0", country: "FR" };
const yearlyKey = `vp1_${VERSY_ANDROID_YEARLY_EXPERIMENT}`;
const recoveryKey = `vp1_${VERSY_ANDROID_RECOVERY_EXPERIMENT}`;
const yearly = { schema: 1, platform: "android", environment: "production", randomized: true, assignedAt,
  experiment: VERSY_ANDROID_YEARLY_EXPERIMENT, variant: "lower", allocation: "equal_thirds", productID: VERSY_ANDROID_YEARLY_PRICES[0].productID };

test("Versy defaults to iOS and scopes Play events and manual notes to Android", () => {
  assert.equal(versyAnalyticsPlatform(undefined), "ios");
  assert.equal(versyAnalyticsPlatform("android"), "android");
  assert.match(versyClientEvents("ios"), /'ipados'/);
  assert.doesNotMatch(versyClientEvents("ios"), /'android'/);
  assert.match(versyClientEvents("android"), /app_environment = 'production'.* = 'android'/);
  assert.match(versyStoreEvents("android"), /PLAY_STORE.*bible_verse_widget/);
  assert.match(versyStoreEvents("ios"), /APP_STORE.*bible-verse-widget/);
  assert.equal(platformAnalyticsStorageKey("versy", "android"), "versy-android");
  assert.equal(platformAnalyticsStorageKey("versy", "ios"), "versy");
  assert.equal(platformAnalyticsStorageKey("poky", "android"), "poky");
});

test("Android price tests use verified saved arms, independent recovery and all enrolled users", () => {
  const installs = [install, { ...install, appUserId: "ios" }, { ...install, appUserId: "mismatch" }, { ...install, appUserId: "debug" }];
  const attributes = new Map<string, Record<string, string>>([
    ["verified", { [yearlyKey]: JSON.stringify(JSON.stringify(yearly)), [recoveryKey]: JSON.stringify({
      ...yearly, experiment: VERSY_ANDROID_RECOVERY_EXPERIMENT, allocation: "50_50", variant: "higher", productID: VERSY_ANDROID_RECOVERY_PRICES[1].productID,
    }) }],
    ["ios", { [yearlyKey]: JSON.stringify({ ...yearly, platform: "ios" }) }],
    ["mismatch", { [yearlyKey]: JSON.stringify({ ...yearly, variant: "middle" }) }],
    ["debug", { [yearlyKey]: JSON.stringify({ ...yearly, environment: "development" }) }],
  ]);
  const report = buildVersyYearlyPriceComparison(installs, [], attributes, asOf, "android");
  assert.deepEqual(report.current.rows.map((row) => row.installs), [1, 0, 0]);
  assert.deepEqual(report.recovery.rows.map((row) => row.installs), [0, 1]);
  assert.equal(report.current.rows[0].conversions?.global.installPaid, 0);
  assert.equal(buildVersyYearlyPriceComparison(installs, [], attributes, asOf).current.status, "empty");
});

test("Android journey and note counts use in-window screen events and canonical app records", () => {
  const flow = { schema: 1, experiment: VERSY_ANDROID_FLOW_EXPERIMENT, platform: "android", environment: "production",
    variant: "dismissible", allocation: "100_dismissible", randomized: false, onboardingJourney: "scroll", assignedAt, viewedAt: assignedAt + 3000 };
  const note = { schema: 1, experiment: VERSY_ANDROID_NOTE_EXPERIMENT, environment: "production", allocation: "50_50", randomized: true,
    variant: "note", flow: "scroll", language: "en", access: "dismissible", assignedAt, viewedAt: assignedAt + 1000, continuedAt: assignedAt + 2000 };
  const attributes = new Map([[install.appUserId, {
    [VERSY_ANDROID_FLOW_ATTRIBUTE]: JSON.stringify(flow), [VERSY_ANDROID_NOTE_ATTRIBUTE]: JSON.stringify(note),
    [VERSY_NOTE_ATTRIBUTE]: JSON.stringify({ ...note, experiment: "versy_paywall_note_v1", variant: "control", flow: "bible_widget", yearlyProduct: "ios", viewedAt: undefined, continuedAt: undefined }),
  }]]);
  const screens = new Map([[install.appUserId, [
    { screen: "onboarding_goal", variant: "scroll_the_bible", seenAt: assignedAt + 1000 },
    { screen: "onboarding_goal", variant: "scroll_the_bible", seenAt: assignedAt + 2000 },
    { screen: "onboarding_reviews", variant: "bible_widget", seenAt: assignedAt + 1000 },
    { screen: "onboarding_verseStory", variant: "scroll_the_bible", seenAt: assignedAt - 1000 },
  ]]]);
  const journey = buildVersyAndroidJourney([install], [], attributes, screens, asOf);
  const scroll = journey.variants.find(({ key }) => key === "scroll")!;
  assert.equal(scroll.assigned, 1);
  assert.equal(journey.countries.FR.variants.find(({ key }) => key === "scroll")?.completionShare, 1);
  assert.equal(scroll.steps.find(({ attribute }) => attribute === "onboarding_goal")?.users, 1);
  assert.equal(scroll.steps.find(({ attribute }) => attribute === "onboarding_reviews")?.users, 0);
  assert.equal(scroll.steps.find(({ attribute }) => attribute === "onboarding_verseStory")?.users, 0);
  const notes = buildVersyNoteReport([install], [], attributes, 0, asOf + 1, asOf, "assignment", true, "android");
  assert.deepEqual(notes.overall.rows.map(({ installs }) => installs), [0, 1]);
  assert.equal(notes.reached.note.continued, 1);
});

test("Google Play offer proceeds group by base plan even if the transaction omits the offer ID", () => {
  const rows = versyOfferRows({
    "com.arthurbuildsstuff.bible.premium:yearly-nov20-lower": { subscriptions: 1, proceeds: 27, missingMoney: false },
    [VERSY_ANDROID_RECOVERY_PRICES[0].productID]: { subscriptions: 1, proceeds: 13, missingMoney: false },
  }, "android");
  assert.deepEqual(rows.map(({ proceeds }) => proceeds), [27, 0, 13]);
});
