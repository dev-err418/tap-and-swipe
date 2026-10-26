# Native paywall analytics (Glow and Poky)

Glow's separate [Journal VS Practice](journal-practice-experiment.md) activity experiment uses `gjp1_journal_vs_practice_v1`. It does not alter the paywall ledger or purchase attribution described here.

## Architecture and constraints

### Pending Glow onboarding paywall-flow test

New eligible installs use **80% testimonials + team note / 20% original sequence**, independently of the onboarding journey and annual price/trial assignment:

| Variant | Label | Traffic | Screens before purchase |
| --- | --- | --- | --- |
| `standard` | Current flow | 10% | Trial introduction → trial reminder → existing paywall |
| `standard_note` | Current flow + note | 40% | Testimonials → team note → current flow |
| `versy_reminder` | Versy reminder flow | 10% | Trial introduction → reminder timing → Versy paywall |
| `versy_reminder_note` | Versy reminder flow + note | 40% | Testimonials → team note → Versy reminder flow |

The two base flows remain 50/50. Both IAM and manifest-audio participate. The treatment restores the original `ReviewSupportScreen` layout (from before `41bdb49`): overlapping profile pictures, rating stats, and three portrait review cards, using Glow's current cream/orange styling. It is followed by a cream card headed “A note from the team,” localized in English, German and Spanish. Both new screens use Continue. The team note and the following trial introduction and reminder screens show “No payment due now” above Continue in secondary text with a lighter tinted checkmark. On each screen the caption and button share one entrance animation, including both base paywall flows. Neither screen requests an App Store review or starts a purchase. Existing trial, reminder-choice, purchase, recovery and Weekly behavior stays with its base flow; the two Versy variants both retain View all plans.

`GlowPaywallFlowAssignment` saves `onboarding_paywall_flow_v2` under `glow.onboarding.paywallFlow.v2.<environment>` and publishes scalar JSON as `gpf1_onboarding_paywall_flow_v2`. Schema remains `1`; allocation is `10_40_10_40` in the table's order. Records retain environment, variant, frozen language, randomized, assignedAt, updatedAt, optional viewedAt/completedAt, reminderLeadDays, initial priceVariant, and onboardingJourney. Timestamps are Unix milliseconds.

Assignment is saved before exposure. Enrollment starts on the **first screen of the assigned sequence**: testimonials for note arms, trial introduction for controls. This includes users who leave at testimonials or the note in the denominator. Drafts resume on the saved screen, and Back traverses the same assigned sequence. Debug previews never enroll. Existing `v1` assignments keep their original `standard`/`versy_reminder` arm, `50_50` allocation, storage key and `gpf1_onboarding_paywall_flow_v1` reporting attribute; neither exposed nor saved-but-unexposed legacy assignments are rerolled. SDK startup republishes enrolled records under their own experiment key.

Tap & Swipe reads both versions. The active A/B report, map and Data flow table show the four v2 variants. The Paywall flow × yearly price table combines note and no-note assignments into Current flow and Versy reminder flow, keeping the six price/trial choices separate. Metrics are recalculated from the combined users; the preview can switch between With note and Without note. The old 50/50 report stays in a separate historical section. Production/randomized records only; assigned users, paywall reach, paid conversion, net proceeds and total APPU include non-payers and pre-paywall dropouts. Recovery purchases, Weekly purchases, renewals and refunds retain their original attribution. Free trial starts are not paid conversions. The user-journey funnel shows testimonials and note as optional branches so controls are not reported as dropping out. Preview dialogs show both new screens before the relevant existing three-screen flow.

The app and dashboard changes require their normal releases; source changes do not deploy either product. No new analytics backend, database, Superwall campaign or placement is added.

### Pending Glow IAM / manifest-audio release

The next app build uses `onboarding_manifest_audio_v3` / `goe1_onboarding_manifest_audio_v3`: **50% `iam` / 50% `manifest-audio`**, allocation `50_50`. IAM is the existing regular mascot-free journey with current localized wording; manifest-audio is the conversational journey. Both use the cream/orange look without a mascot. This does not restore historical IAM wording.

Assignments are sticky for eligible new users. Existing v2 users retain `onboarding_copy_mascot_v2` / `goe1_onboarding_copy_mascot_v2`, their `current` / `mascot_free` variants and `30_70` or `15_85` allocations. They continue reporting under v2, without reenrollment. Existing v1 users keep their presentation without further v1 activity/completion writes. Legacy assignments, saved drafts and completed profiles are excluded from fresh enrollment. Debug previews cannot record completion; completion requires the assigned journey.

The Glow A/B test card and experiment map compare IAM with manifest-audio, with assigned users, completion, net proceeds/ARPU, sessions per observed user-day and average time to cancellation. V2 and v1 reports remain separate historical sections. All three assignment keys exclude users from the legacy wording comparison. Purchase attribution and transaction joins are unchanged. The paywall price/trial test has a separate v5 assignment and remains independent of onboarding; saved v4 assignments retain their identity. Both onboarding arms use the same native paywall placement.

These source changes are not deployed automatically: release the updated app and deploy the dashboard. Older App Store clients can still run their previous experiment. Empty states do not imply enrollment is already live.

Glow and Poky render native SwiftUI paywalls and hardcode their experiments/traffic splits. Superwall is used only for purchase/subscription infrastructure and custom user-attribute storage. **Do not add Superwall campaigns, placement registration, presentation-result calls, or remotely configured experiments.** No D1/PostgreSQL tables, ingestion routes, or webhook receivers are needed for this feature.

The dashboard's existing server-side Superwall Query API connection reads these records. Never expose `SUPERWALL_GLOW_API_KEY` to the browser or the iOS app. Queries use organization 27020/application 54736, production data only. The existing 90-second analytics cache also caches this report.

Related app files (in the sibling `glow-app/glow-app` repo):

- `native/Glow/NativePaywallAnalytics.swift`: persisted local state, scalar-JSON attributes, transaction observer.
- `native/Glow/GlowProductID.swift`: `GlowPaywallVariant` and persisted `GlowYearlyPriceAssignment`, active v5 six-way price/trial split; saved v4 three-price assignments remain sticky.
- `native/Glow/SuperwallService.swift`: custom entry-point reach/dismiss hooks; no SDK placement registration.
- `native/Glow/Views/GlowPaywallView.swift`: actual appearance hook.
- `native/Glow/GlowSubscriptionStore.swift`: capture purchase attempt/result.
- `native/PAYWALL-ANALYTICS.md`: app-side contract and extension instructions.

From October 7 through October 11, 2026, US/USA users receive yearly-only native paywalls in every language. The existing geo lookup resolves before startup product loading and analytics; non-US and unknown-country users retain their normal assignment. Package variants map to their yearly-only counterpart while preserving the assigned annual product and price. The saved v3 assignment is unchanged, and regular presentation resumes at local midnight October 12. Manual Debug design previews remain isolated. These presentations use the separate nonrandomized `native_paywall_us_yearly_oct2026` analytics experiment with `yr_49`, `yr_59`, or `yr_34` and only the matching yearly SKU in `allowedProducts`; do not mix them into the v3 randomized comparison. No fixed allocation badges are assigned to this temporary geographic cohort. Glow recovery offers also remain restricted to known non-US users through October 11; all countries, including unknown-country users, become eligible at local midnight October 12, 2026.

The next Glow build starts `native_yearly_prices_v5`: three annual prices × two trial lengths, six equally likely assignments (1/6 each). Existing `native_yearly_prices_v4` assignments retain their 7-day SKU, timestamp and immutable attribution. The Data yearly-price and flow × price tables pool matching v4/v5 7-day arms and add distinct 3-day rows; earlier five-way and forced presentation cohorts remain separate. Native purchase-attribution reports retain each experiment's identity. All storefront prices come from StoreKit; US anchors are $34.99, $49.99 and $59.99. The independent reminder flow can still offer the fixed Weekly alternative, attributed to the saved annual-price arm.

Dashboard files:

- `lib/native-paywall-queries.ts`: paginated attribute fetch, authoritative money queries.
- `lib/native-paywall-analytics.ts`: validation, attribution, cohort aggregation and statistics (pure/testable).
- `lib/native-paywall-allocation.ts`: mirrors the upcoming Glow `native_yearly_prices_v5` six-way price/trial split, preserves v4’s 1/3 split and the released Glow 1.7.2 `native_paywalls_v3` five-way split: `yr_wk_59` and `yr_wk_34` received 25% each; `yr_49`, `yr_59` and `yr_34` shared the remaining 50% equally (exactly 1/6 each, displayed as ~17%). Variant and paywall identity are the same stable string. The temporary English presentation uses the separate, nonrandomized `native_paywall_legacy_en_sep2026` experiment with `yr_59` at 100%. Historical `native_yearly_v1` stays Annual/Pro yearly 50/50, and `native_paywalls_v2` retains its 25/25/50 allocation. Supports both demo variant IDs and live composite `variant|paywall` row IDs. Unknown allocations are omitted, never inferred from user counts. Badges describe code configuration, not observed traffic.
- `components/analytics/NativePaywallsPanel.tsx`: language audience filter, all experiment groups, paywall/placement tables.
- `lib/mobile-app-analytics.ts`: loads this report for Glow and Poky's detail views.

Poky uses the same contract from `peptides/Subscription/PokyNativePaywallAnalytics.swift`.
Its updated onboarding offer test assigns fresh installs equally to HP, a three-day
trial, the current seven-day flow and a mascot seven-day flow (25% each). Purchases and restores use the existing
Superwall SDK with observer mode disabled, alongside verified StoreKit access.
No trial campaign or placement is registered. All trial arms skip High/Name and
recovery. The primary `poky-trial-vs-current` card reads fresh
`poky_onboarding_trial_v3` / `25_25_25_25` scalar assignments (`current`, `trial`,
`trial_7d`, `trial_7d_mascot`). Separate historical cards read v1 / `50_50` and
v2 / `25_25_50`; populations are never
pooled. Each report counts assigned nonviewers, trial starts, renewals and refunds,
and excludes returning `legacy` assignments. The current flow now uses only native
paywalls, including for former Superwall cohorts. Its recovery rollout is reported separately; the retired Superwall/native engine
comparison is no longer loaded, displayed or counted as an active test.
Its stable per-language experiments use `poky_native_main_v1_<language>`
(English/fallback High/Name 50/50; German, Spanish, and French Name 100%) and
`poky_native_recovery_v3_<language>` (Recovery 100%, nonrandomized). V3 has one
sticky record per install, with its initial language frozen across later language
changes. Former v1/v2 holdouts receive recovery under a new v3 record; historical
assignments and transactions remain untouched.
Automatic recovery is once-ever and evaluated after
a main purchase cancellation or main-paywall decline, independent of origin
placement. `poky_context_recovery_v1_<language>` reports the separate explicit home-screen
shortcut, which is always Recovery and does not consume automatic recovery.

Poky enrols non-premium users during splash, after entitlement refresh; the actual
production view's appearance hook records views. Debug previews do not enrol
production users. See Poky's `docs/NATIVE-PAYWALL-TRACKING.md` for the app-side lifecycle.

### Recovery and onboarding A/B reporting

The Recovery/Holdout A/B test is retired. The active map shows one 100% Recovery
branch for the current offer, after main-purchase cancellation; trial paywalls
have no automatic recovery branch. The once-per-install flag is preserved across
updates, so users who already saw recovery do not receive it again.

The route no longer loads the v2 recovery A/B card or counts it as active. The
map's metrics and details use only `poky_native_recovery_v3_<language>` from the
native paywall report; missing v3 data stays empty rather than borrowing historical
v1/v2 results. V3 records have `randomized: false`, `variantCount: 1` and a 100%
allocation. Proceeds use direct purchase attribution and cannot name an A/B winner.

Historical v1/v2 rows remain separate in the Paywalls report and are labelled legacy
or retired. Their original allocations and records are preserved. The isolated
`lib/poky-native-recovery.ts` helper documents the historical full-flow comparison;
it is no longer used by the active A/B route. Explicit home-shortcut recovery
continues to have its own attribution.

Result cards follow onboarding intro/plan results and the current/trial offer
comparison. The retired Superwall/native and Recovery/Holdout comparisons are absent.

Fresh intro and plan screen assignments publish their own `50_50` allocation
markers. The four-way plan comparison requires both markers; legacy assignments
are excluded. Poky now routes every user through the Warm experience, and the
retired Original/Warm comparison is absent from the dashboard. Historical raw
attributes remain stored. Do not lowercase attribute JSON during parsing.
Current Poky onboarding reports also require `poky_tracking_environment=production`,
so Debug overrides cannot contaminate them even before the SDK labels a user sandbox.

Poky's Data-tab User journey now uses the same boolean screen attributes as
Versy. The app freezes `onboarding_variant` at Welcome into the four existing
intro × plan combinations: `control_plan_a`, `control_plan_b`, `animated_plan_a`
and `animated_plan_b`. The loader requires `poky_onboarding_journey_schema=1`
and the production environment marker. Returning subscription gates do not
enroll users, and historical screen progress is never inferred or backfilled.
The animated routes insert `animated_plan_intro_screen_seen` before the plan.
All routes finish with `onboarding_paywall_screen_seen`, recorded only when the
native main or trial onboarding paywall actually appears in the updated app.
Previously recorded Superwall paywall views remain historical data. Recovery offers,
debug previews and failed presentation requests do not count. Screen flags carry
no onboarding answers or health values. The existing install date filters,
unique-user denominator and drop chart apply unchanged; paywall seen is the
funnel's final stage, not a purchase or completed onboarding event.

## Storage contract: gp1

### Live data only

The dashboard always renders live Superwall data and has no demo toggle. `lib/native-paywall-demo.ts` remains a test fixture for allocation and experiment-map coverage only; it is not reachable from the dashboard and no sample records are sent to Superwall.

The detailed app chart and note editor use `Europe/Paris`, independently of browser/server timezone. Today/Yesterday follow Paris calendar days (including 23/25-hour daylight-saving days); rolling 3/7/30-day filters remain elapsed-time windows. Four-hour buckets follow the Paris clock and daily buckets start at Paris midnight. `lib/app-analytics-time.ts` keeps SQL and purchase-event buckets aligned. Stored note timestamps and chart bucket timestamps remain UTC instants; never parse a Paris wall-clock string as UTC. Unrelated website funnel charts retain their existing timezone.

### Read-only live verification

Run `npx tsx scripts/check-native-paywall-tracking.ts` with the existing server
environment credentials. It exercises the report loader and checks recent Apple
integration revenue for both apps, printing aggregate counts only. It neither
creates transactions nor changes campaigns. Credentials and server revenue were
verified on 2026-09-19; no Poky native gp1 records had arrived at that time. That
does **not** prove the released Glow 1.7.2 purchase path end-to-end. Verify a native transaction's immutable
context against Apple's original transaction ID. Sandbox events remain excluded
from production reporting. Missing server revenue is shown as a warning, and
winner estimates for the affected experiment are suppressed until reconciled.

Superwall attribute values must be scalars. Each record below is a **JSON-encoded string**, not a nested attribute object or array. Keys do not use Superwall's reserved `$` prefix.

| Key | Record | Mutability |
| --- | --- | --- |
| `gp1_a_<experiment>` | Assignment | Identity/variant/language/date are immutable; first view/product filled once |
| `gp1_p_<experiment>__<placement>` | First reach and first actual view of one custom placement | First timestamps immutable |
| `gp1_t_<Apple transaction ID>` | Verified purchase and its original presentation context | Immutable per transaction |

Assignment/placement payload:

```json
{
  "schema": 1,
  "environment": "production",
  "experiment": "native_paywalls_v3",
  "experimentName": "Native paywalls · 5 variants",
  "variant": "yr_wk_59",
  "variantName": "yr_wk_59",
  "paywall": "yr_wk_59",
  "language": "en",
  "assignedAt": 1790000000000,
  "randomized": true,
  "variantCount": 5,
  "expectedProduct": "com.arthurbuildsstuff.glow.pro.yearly",
  "allowedProducts": ["com.arthurbuildsstuff.glow.pro.yearly", "com.arthurbuildsstuff.glow.Weekly"],
  "viewedAt": 1790000030000,
  "displayedProduct": "com.arthurbuildsstuff.glow.pro.yearly"
}
```

Placement records add `placement` and `reachedAt`. `expectedProduct` is the default product; `allowedProducts` lists valid offers in the assigned design. It is optional for backward compatibility: missing means `[expectedProduct]`. The list is inside the scalar JSON string, never a raw Superwall attribute array. `hadFallback: true` persists if a presentation selects a SKU outside that set. A Weekly purchase from either `yr_wk_59` or `yr_wk_34` remains a valid conversion for its assigned design, not contamination. Purchase payloads contain `context` (a copy of the placement record with the current selected product), `productID`, `startedAt`, `transactionID`, `originalTransactionID`, and `purchasedAt`. All times are UTC Unix milliseconds; transaction IDs are decimal **strings**, never JS numbers. IDs for experiments/variants/paywalls/placements use lowercase ASCII letters, digits and underscores (max 100 characters).

V3 is assigned on the first launch of the new build and persists variant, time and language together in `glow.paywall.assignment.v3`; reporting publishes it after SDK startup for unsubscribed users. Existing installs get a fresh randomized v3 assignment too, so this is not exclusively a first-install cohort. Existing subscriptions are unchanged. The old `glow.paywall.yearly.v1` and `glow.paywall.assignment.v2` buckets, historical v1/v2 records and pending purchase contexts remain untouched. V1 records predating timestamp tracking remain `randomized: false`; v3 never rewrites or backdates them. Already subscribed users are not newly enrolled in reporting at startup. Views mean **unique people**, not repeated impressions; a placement reach does not imply a view.

Language comes from Glow's resolved app localization and freezes at assignment. Later language changes do not move historical results into another audience. A new experiment needs a new ID; never overwrite old assignments to restart a test. V3 tests three yearly-only anchors and two Yearly/Weekly designs. Twelve uniform app-side buckets give exact weights of 2/2/2/3/3. Both package designs use `com.arthurbuildsstuff.glow.Weekly`; both $34.99 designs use `com.arthurbuildsstuff.glow.yearly.3499`. The latest verified Apple status for that $34.99 subscription was `READY_TO_SUBMIT` on September 21; the 1.7.2 release alone does not establish product approval or StoreKit availability. The panel shows the configuration even without live data, never fabricated result rows. The same assigned variant appears at every placement, full-screen for onboarding and modal otherwise. Glow 1.7.2 uses the yearly-only `yr_59` offer and separate legacy experiment through September 26, 2026 (device local time). Glow 1.7.3 extended that override through September 28. The updated app extends the English-only override through October 5, 2026; saved v3 assignments resume at device-local midnight on October 6. Earlier app versions retain their original cutoff until updated. `yr_59` and `yr_wk_59` remain separate even when both sell Pro Yearly; never infer the design from SKU. Legacy `themes_upgrade_top_card` remains a valid ID but has no active card in the current app UI.

## Purchase, renewal, refund attribution

1. Before purchase, Glow durably saves the current native presentation and product as an attempt. Cancellation/failure clears it; `.pending` keeps it across app restarts. Another purchase of that product cannot overwrite a pending attempt.
2. The StoreKit purchase result and a read-only `Transaction.updates` observer reconcile **verified, non-revoked, explicit purchase** transactions against the matching product and attempt start timestamp. Restores of older transactions and automatic renewals cannot consume an attempt. Startup reconciles pending attempts with `Transaction.latest(for:)`.
3. A successful match publishes `gp1_t_<transactionID>` through normal Superwall attributes. It does not modify access or finish the transaction; Superwall remains responsible for that.
4. The dashboard joins this record to Superwall's Apple integration events by original transaction ID. An exact purchase transaction wins; renewals follow the latest preceding purchase anchor in that subscription chain. Refunds use the charged transaction's purchase date/ID so a late refund cannot be reassigned to a later paywall.
5. Only server integration money events are summed. SDK transaction completions are not counted again. Deliveries are deduplicated by original transaction ID + transaction ID + charge/refund direction, preferring the latest attribution revision.

**Refunds may be `cancellation` events with `isRefund = 1`.** Ordinary cancellations have no money effect. Refund revenue/proceeds are normalized negative for net proceeds; the Refunds column shows positive refunded customer revenue. Customer revenue and proceeds are not interchangeable.

September 19, 2026 validation: live Glow data contains original transaction IDs for initial purchases, renewals and refunds; refunds were observed as cancellation events. Native 1.7.0 transactions contain custom attribute snapshots despite having no Superwall paywall/placement attribution. SDK 4.16.3 merges attributes on a serial queue and synchronizes reads through `userAttributes`. Automated tests exercise delayed approvals/relaunches, original-placement preservation, renewal/refund joins and duplicate delivery. No production purchases were generated for testing.

September 25, 2026 live check: Apple's public lookup lists Glow 1.7.2, released at 10:43 UTC. The dashboard's production Superwall query returned `ready` with no warnings. It found 16 English users, 12 viewers and 4 conversions in `native_paywall_legacy_en_sep2026`, plus 3 English users assigned to `native_paywalls_v3` with no recorded view yet. Historical v2 data remains separate. These early counts verify attribute delivery and cohort separation, not purchase attribution for v3 or $34.99 product availability; continue the device/sandbox lifecycle check.

## Metric definitions

### App overview trends

The app detail overview shows orange install bars and a blue **APPU** line on one
chart. Installs use the left count axis; APPU uses the right dollar axis. The
summary has three equal-width blocks with vertical dividers: Installs, APPU and
**Conversion to paid**. Conversion is unique tracked installers with a positive production
charge through report time / all tracked installers in the selected period and
language. Free trials do not count; renewals and multiple purchases count a user
once, and later refunds do not undo a past conversion. Identity-free renewals
follow known original-transaction owners. Missing payment amounts leave conversion
unavailable. There is no fixed-day checkpoint selector or retention series in this
overview. Proceeds remain available under **More metrics**.

The period selects installs. APPU is all production net proceeds linked to those
tracked installs **through report time**, divided by all tracked installs,
including recent installs and non-payers. Each chart point follows its install-date
cohort through the same report time. Renewals and refunds are included. Younger
cohorts have had less time to earn; this is not a fixed-age D7 comparison.
Authoritative `first_seen` totals supply Installs and the bars, and never substitute
for the tracked-install APPU denominator. Summaries divide summed proceeds by
summed installs instead of averaging daily APPU. Known original transaction chains
resolve identity-free renewals/refunds; duplicate money deliveries count once,
preferring the latest attribution revision. Missing proceeds suppress the affected
APPU instead of becoming zero. Glow's existing mature country-chart filter is
unchanged and does not apply to this overview.

The overview language picker defaults to **All languages** and filters only the
main chart and its Installs/APPU/Conversion to paid summaries. Language is the earliest recorded
install device language, normalized to the base code (e.g. `es-MX` → `es`). Missing
or malformed codes remain **Unknown language**, and later language changes do not
move users. Linked renewals/refunds follow the install's language. Language views
use **Tracked installs** for bars and counts, including non-payers; the aggregate
`first_seen` totals have no language breakdown. All languages retains authoritative
install totals and the weighted APPU over every tracked install, including unknown
languages. Other cards and More metrics retain their full-period audience.

Install buckets match the original acquisition trend: hourly for Today, Yesterday
and Last 3 days, four-hour Paris-clock buckets for Last week, and daily buckets for
Last month and All time. APPU is a flat segment for each Paris calendar day, changing
at midnight. Its daily value divides summed linked proceeds by summed tracked
installs for that day and selected language; it never averages hourly rates.
Partial days use only the selected report window. Missing proceeds suppress the
whole affected day's APPU, and days with no tracked installs remain gaps.
Both repeated autumn hours remain distinct; nonexistent spring hours are skipped.
Installs and daily-average APPU share one tooltip. Notes use the original
title/version labels, purple dashed lines centered on their matching buckets, and
hover Add note button; their editor is unchanged.
Failed cohort queries show unavailable while independently loaded install totals
remain visible. Fixed-age and subscription-retention calculations remain available
in the underlying cohort report and separate reporting views.

The **Experiment map's onboarding tree** uses the four
`poky-plan-design-combinations` intro × plan screen cohorts, including non-payers
and scoped to the selected language. Each plan leaf shows total proceeds per
install. Each intro parent sums its Plan A and Plan B users and proceeds before
dividing. Missing joint data stays unavailable. Intro nodes only branch to their
own two plan screens, so independent assignments do not create crossing paths.
The subsequent merged paywall stages retain their separate paywall-assignment
populations and direct purchase attribution. Poky's map has no footer notes;
hovering a populated onboarding node shows users and net proceeds.

Every map card opens a stats dialog on click, Enter or Space. It reuses the current
loaded A/B card or native paywall results table, scoped to the map language without
additional queries. Joint-cohort branch summaries use the same weighted totals as
the map and show total APPU in the comparison. Structural cards open the relevant
next-stage test. Journal/Practice opens the activity report labelled All languages
because that report is not language-segmented. Missing results stay unavailable;
closing the dialog returns keyboard focus to the map card.

Most A/B result cards display APPU D7 and D14; the full-flow Recovery card uses total APPU. D30 APPU remains available in the underlying data. Glow and Poky's historical Superwall-vs-native comparisons load Superwall installs from 30 days before their September 20 experiment cutoffs (August 21), while native installs retain the selected, cutoff-clamped cohort window. This expanded history is isolated from other experiment and dashboard totals. Their planning panels are indicative, with no completion-date projection or decisive verdict for these non-randomized cohorts. Glow classifies the earliest observed install version as Superwall before 1.7.0 and native from 1.7.0; upgrades do not move that user. All linked outcomes are followed through now, including historical trial starts/conversions, renewals and refunds; revenue is deduplicated and trial/paid counts are unique users.

Glow and Versy use version-based install cohorts across the Data comparison tables, Trial survival, AB tests and Paywalls: **first install v1.8.3+ for Glow, v1.2.6+ for Versy**, across all time. The version is frozen from the earliest production `device_attributes` event; later upgrades and unknown/malformed first versions do not enroll users. The dashboard date selector continues to control the overview, App versions and countries sections. Trial survival uses that same all-language, all-country install cohort and follows its subscription chains through report time, including cancellations with no user ID. Subscriptions started before installation are excluded; only recorded seven-day trials enter the survival chart. Poky comparisons use first-install v1.1.5+ across all time. Outcomes follow report `asOf` (now). Win-back and Versy app-event reports join the same Superwall install identities to their PostHog distinct IDs before counting views/purchases. Placement rows include only cohort members reaching that placement and can overlap in users; each transaction is attributed to one placement.

### App version comparison

Journey, paywall flow, price and joint tables include APPU lift and Win % immediately after Installs, with a red/green uncertainty distribution.
App versions show APPU and conversion metrics without lift or Win %.
Onboarding, paywall flow, yearly price and joint comparison titles include the
small readiness ring. It uses observed per-user proceeds variance and the table's
APPU Win % with a 30% relative-effect, 85% confidence and 80% power
planning target. Every planned variant must reach its target before the result
can be decisive; a full sample without an 85% leader stays inconclusive. Missing
proceeds or variance leave planning unavailable. Country changes recompute the
indicator from that country's cohorts. App versions have no readiness indicator.
All apps’ overview, App versions and country charts use all languages; there is no implicit Spanish, English or Portuguese restriction. Tables scroll horizontally with
hidden scrollbars. The first populated row in each audience is the labelled baseline.
Win % is the estimated probability of highest APPU among populated rows in that
same audience, using 20,000 deterministic normal draws of cohort means with actual
sample variance of **per-install total net proceeds** (including zero-paying users,
renewals and refunds). No conversion-rate proxy or synthetic variance is used.
Estimates need complete revenue, at least two populated rows, 20 installs per
populated row and positive observed variance in each. Empty rows are excluded.
The 85% lift interval uses the delta method; it is withheld when the baseline's
85% interval includes zero. Hover/focus details explain unavailable estimates and
the model. These are descriptive comparisons, not causal claims; cohort ages and
audiences may differ. No user-level proceeds are sent to the browser.

Glow and Versy's Data-tab user journey is a flow-only table with installs, APPU
(net proceeds per enrolled install), trial starts, trial-to-paid, install-to-paid,
refund rate. It uses the screen funnel's enrollment/schema and
production markers, all languages/countries and the version-based install cohort above.
Refund rate here is refunded transaction count / paid purchase transaction count,
including renewals and excluding free trials; it is distinct from the paywall
table's revenue-based refund rate below. Deduplication and transaction-chain
ownership match the version table. Missing charge amounts suppress refund rate.
Clicking each onboarding funnel name opens its existing screen funnel in a modal. The
active-trials card is removed from Data; the trial-survival chart remains.

Glow also has compact **Paywall flows** and **Yearly prices** tables below User
journey. Both use the first-install v1.8.3+ cohort across all time, in all languages and countries. Flow membership uses validated randomized production
`gpf1_onboarding_paywall_flow_v2` for the four current arms, with `gpf1_onboarding_paywall_flow_v1` kept in separate historical tables; prices read `gp1_a_native_yearly_prices_v4` (three 7-day arms) and
`gp1_a_native_yearly_prices_v5` (six price/trial arms). Matching 7-day arms are pooled,
while 3-day arms remain distinct; a user with both records counts once under the original v4 assignment. Startup price assignment can precede the SDK's install timestamp;
this does not exclude the install. Outcomes begin at the later of installation
and assignment and run through report time. Earlier subscription chains are
excluded. Non-payers remain in the denominator, and renewals, weekly purchases,
recovery purchases and refunds stay with their saved assignment. These are
full-cohort outcomes, distinct from placement-specific purchase attribution.
The tables reuse the journey's metrics and transaction-count refund rate, with
no acquisition split. Missing facts show unavailable; missing amounts suppress
the affected metrics. Data requests load the two assignment attributes alongside
existing facts; no extra database or ingestion service is introduced. Snapshot
schema v27 includes these tables, the joint flow × price comparison, and version-based cohort membership. A/B and Paywalls attribution rules remain unchanged within that install cohort.

The Data, AB tests, and Paywalls tabs can compare a selected app version. A user's **first recorded version on a production `device_attributes` event** fixes their cohort: versions below the selected version are Before, and the selected version or newer are After. Versions are compared by numeric components, so 1.10 is newer than 1.9. Missing or malformed first versions are excluded from both sides; they are not inferred from later upgrades. The Data comparison follows the selected dashboard period, while Glow/Versy A/B tests, native paywalls and win-back offers use the version-based install cohorts above; Poky uses its first-install v1.1.5+ cohort. The difference column is After minus Before; rate differences are percentage points. These version cohorts are observational and do not imply that a release caused a change or establish an A/B winner. Native paywall, Journal VS Practice, and win-back comparisons resolve first versions for assigned or viewing users even if they installed before the report window. Win-back remains a separate PostHog view-to-purchase report with no revenue or refund attribution.

- **Users:** all assigned users for a paywall; assigned users who reached a particular placement for placement rows.
- **Views:** unique users actually shown that paywall/placement. Repeated openings count once.
- **Conversions:** unique users with a verified attributed purchase, including free trial starts. Renewals/restores are not new conversions. The number can lead Apple's server event delivery.
- **Conv. rate:** conversions / unique viewers. Its whisker is a 95% frequentist confidence interval over the aggregate cohort, not the minimum and maximum observed daily rate. The UI uses a Wilson score interval because Superwall documents the confidence level and interpretation but does not publish its exact formula; treat it as a close statistical analogue, not an exact reproduction of their private calculation. The conversion cell also exposes the distinct paid-user count.
- **Proceeds:** net USD proceeds after fees/taxes and refunds, including renewals attributed to that origin.
- **Total APPU:** all net proceeds attributed to the paywall through today / all assigned Users, including zero-paying users. Renewals and refunds remain attributed to the originating paywall. The Paywalls tab has no D7/D14/D30 selector or fixed-age APPU column.
- **Probability best:** approximate chance of highest total APPU across variants of the same experiment/audience. Normal sampling uses each user's full attributed proceeds through today, including zeroes, renewals and refunds. The zero-centered orange/blue bar beneath it is the 95% confidence interval for total APPU lift versus the first paywall arm; crossing zero means either paywall could still be better. The estimate appears as soon as every clean randomized arm is present, with an early-data warning until every variant has >=20 users and >=3 paid users. It remains suppressed for inherited assignments, fallback products, missing variants, or incomplete money data. These are model-based estimates, not guarantees or a sequential-testing stopping rule.
- **Experiment readiness:** sample planning is shown as a compact progress ring beside each randomized comparison title, with the details on hover or keyboard focus. Paywall tests target 95% confidence, 80% power and a 50% relative minimum detectable effect using observed per-user total proceeds, with a floor of 20 users and 3 payers per variant. Choosing a larger detectable lift makes the plan practical for low traffic but means smaller improvements will not reliably finish the test. The displayed percentage is total observed participants / total planned participants and may exceed 100%; completion still waits for every arm to reach its own target, and the tooltip separately reports what the underfilled variants need. A result is only labelled decisive after both the planned sample, balanced-arm requirement and 95% probability threshold are reached. Placements, single-offer allocations, inherited assignments, fallback products and unreconciled money do not receive a readiness verdict.
- **Refunds:** absolute refunded customer revenue in USD.
- **Refund rate:** refunded customer revenue / gross customer revenue before refunds; not refund count / conversions, and not refunded revenue / net proceeds.

Placements are not randomized arms. Their total APPU is descriptive; their Probability best stays blank with an explanation. Summing paywall rows within one experiment is valid; summing different experiments or placement user counts can double-count people.

## Limits and failure behavior

Glow's Data-tab Countries/APPU and CR horizontal charts (including their metric menus,
tooltips and detail views) use mature install cohorts. Users must be at least
72 hours past installation and, when a trial is observed, 72 hours past its start.
Cancelled trials and non-payers remain in the eligible denominator; immediate
buyers do not qualify early. The date picker selects installs, with their linked
transactions followed through now, including later conversions, renewals and
refunds. All metrics use the same users and their install country. Recent-only
periods can therefore have no mature data. This filter does not change the
overview totals, trend, trial-survival chart or other apps. Glow's CR is paid users /
installs, using the same 72-hour-mature cohort as APPU.

- Historical pre-instrumentation views/placements cannot be reconstructed; keep them untracked.
- Local persistence is scoped to Superwall identity and build environment. Uninstall/reset loses local pending attempts; there is no cross-device assignment synchronization. Do not introduce login/identity switching without designing migration.
- Client analytics is not an entitlement authority. Purchase outcomes/revenue must continue to use verified StoreKit/server events.
- We store first views, not an event log of every impression. Arbitrary daily repeat-impression reporting is unsupported.
- Superwall delivery is asynchronous. A purchase whose attribution pointer has not uploaded yet will appear later. If the app never resumes to observe a deferred approval, that attribution is not guaranteed until it does.
- Attributes are paginated. Reaching 200,000 records, a transaction batch exceeding 50,000 rows, or a query failure shows unavailable rather than silently biased zero/partial results. Retention/rate limits remain Superwall's; no independent warehouse copy is maintained.
- Development/sandbox records and malformed schemas are excluded. Malformed or missing monetary data produces visible warnings.
- Do not change the generic AB-tests statistics as part of this feature; this panel uses its own user-level variance calculation. The older native-vs-web version comparison remains separate and is not a randomized experiment.

The Paywalls tab also shows a separate **50% win-back offer** section for Glow and Versy. It reads production PostHog `winback_paywall_viewed` and verified `winback_purchase_completed` events across all time for the version-based install cohort above. A conversion is a distinct viewer who later bought the same yearly product from the same source within that window. Glow purchase events join by `original_product_id` because the discounted SKU differs; Versy joins by `product_id` because the promotion uses the original SKU. The panel breaks out source and yearly product. This is a view-to-purchase rate, separate from the regular native paywall experiment and its APPU, proceeds, and refunds. The dashboard does not attribute revenue or refunds to this offer. No production views show an empty state; read failures and the 20,000-group safety limit show unavailable instead of a partial rate.

## Verification

```sh
npx tsx --test scripts/tests/native-paywall-analytics.test.ts
npx tsc --noEmit
npx eslint lib/native-paywall-analytics.ts lib/native-paywall-queries.ts components/analytics/NativePaywallsPanel.tsx
npm run build
```

For a new app release: verify first assignment without a view, repeated views, two entry points, purchase/cancel, Ask to Buy across restart, restore, renewal, refund and language change in sandbox. Confirm `gp1_` fields in Superwall and exclusion from production reporting. Do not fabricate old timestamps or sample production rows to populate an empty dashboard.

Sources: [attributes](https://superwall.com/docs/ios/sdk-reference/setUserAttributes), [Query API](https://superwall.com/docs/dashboard/guides/query-clickhouse), [direct purchases](https://superwall.com/docs/ios/guides/advanced/direct-purchasing), [pricing](https://superwall.com/pricing). Published pricing bills Superwall-rendered paywall revenue; this implementation does not render or register their paywalls. Historical Superwall-attributed subscriptions remain historical and are not rewritten.
# Poky: native-only paywalls

The updated iOS app removes the Superwall/native engine A/B test. Every current-flow
user now sees a hardcoded native paywall, including users with an old Superwall
assignment. The independent current/trial and High/Name assignments remain. Recovery is now
100% for non-trial users, tracked separately from the retired holdout experiment.
This describes the updated app configuration; older installed builds can still emit
historical engine assignments until users update.

The analytics route no longer requests `poky_paywall_engine_assignment_v1` or builds
the `poky-superwall-vs-native` result card. The experiment map connects the current
offer directly to its localized native paywalls, with no engine or Superwall recovery
branch. Poky's active A/B count is four. Native paywall views and purchase attribution
continue using the existing `gp1_` records; missing native assignments are never
inferred from an old engine assignment.

Historical Superwall attributes and transactions remain untouched. The isolated
`lib/poky-paywall-migration.ts` helper and its tests document the retired experiment,
but are not loaded by the analytics route. Do not continue presenting its cohorts as
a live randomized comparison after users switch to native paywalls.

# Poky plan intro × plan design

The plan screen has a new independent, saved 50/50 Plan A/Plan B assignment.
Together with the existing 50/50 animated intro assignment, the dashboard
shows four 25% cohorts at the top of Poky's A/B results. Plan B is a placeholder
screen until its final design is ready. Completed onboarding users remain on
Plan A and are excluded from the new comparison; only fresh `50_50` markers on
both attributes enter the four-cohort report. Everyone now uses the Warm
experience; the old background test is retired. Paywall tests remain separate.

### Glow onboarding recovery (October 2026)

Glow's onboarding paywall now changes to a full-screen recovery offer after a primary purchase cancellation or close. Closing recovery completes onboarding. It uses the assigned variant's yearly product and its existing recurring half-price SKU, including when the cancelled primary choice was weekly. The five primary variants and their allocation are unchanged.

The journey includes `onboarding_recovery_screen_seen` as an optional branch after the primary paywall; it is published only when recovery actually appears. It does not alter primary completion or main-path drop-off. The existing `winback_paywall_viewed` / `winback_purchase_completed` events distinguish `onboarding_purchase_cancelled`, `onboarding_paywall_dismissed`, notification and debug sources. Before local midnight October 12, 2026, US/USA and unknown-country users skip recovery; the restriction expires automatically.

### Versy journey schema 2

Versy's updated Data-tab funnel groups Bible Widget and Bible Scroll, with separate
Full/Shorter Widget routes. See [the journey contract](versy-onboarding-journey.md)
for enrollment, persisted screen flags, debug exclusion and release requirements.

### Versy verified native attribution

Versy now uses the same gp1 loader and tables as Poky. See
[the Versy report contract](versy-product-analytics.md) and Versy's
`native/PAYWALL-ANALYTICS.md`. Fresh Welcome cohorts include non-payers; returning
users stay separate. Route outcomes are descriptive across all countries; the
existing A/B results retain their geography exclusions. The Paywalls tab exposes
paid users separately from trial-inclusive conversions and defaults to all
languages, including Portuguese. Legacy PostHog placement counts remain below
the verified tables. The read-only smoke check accepts `--app=versy`.

### Glow reminder-flow plan sheet

The Versy reminder treatment now offers “View all plans”: the same assigned annual SKU plus the fixed Weekly SKU, with annual selected by default. Weekly has no introductory trial. This is part of the paywall-flow treatment, not a randomized weekly-price arm. The annual-price experiment remains three equally likely annual anchors.

On reaching that treatment, the native ledger permits Weekly in the assignment and current placement's `allowedProducts`; existing pending/completed purchase snapshots remain unchanged. For `native_yearly_prices_v4` and `native_yearly_prices_v5` only, the report accepts offer-list evolution from the assigned annual SKU to that same SKU plus `com.arthurbuildsstuff.glow.Weekly` when matching attribution. Experiment, variant, paywall, language, assignment timestamp and expected annual product must still match. Other product changes remain mismatches; no historical experiment rule is relaxed.

Splash loading awaits all six annual price/trial products, Weekly and recovery-offer preloads. The app keeps the full catalog separate from the annual-only primary presentation.

The **Paywall flow × yearly price** table has twelve rows (two base flows × three prices × two trial lengths). Current flow pools `standard` + `standard_note`; Versy reminder flow pools `versy_reminder` + `versy_reminder_note`. The separate Paywall flows table and A/B report retain all four arms. The v1 experiment stays in the historical section.
Membership requires both validated assignments for the same install; it is never
inferred by multiplying aggregate totals. Outcomes start after the later assignment
and installation. Users missing either assignment remain in their separate table
only. The joint table uses the same compact metrics and version-based install cohort.

### Poky compact Data comparisons

Poky Data shows all four tracked onboarding combinations (No intro × Plan A/B,
Animated intro × Plan A/B), including empty rows. Clicking a row opens its screen
funnel. Paywall flows prepares four rows for fresh `poky_onboarding_trial_v3`
assignments with allocation `25_25_25_25`: `current` is HP, `trial` is the 3-day
trial, `trial_7d` is the current 7-day presentation and `trial_7d_mascot` is its
mascot presentation (25% each for new assignments). Matching flow identities are
pooled in this single table across v1 / `50_50`, v2 / `25_25_50` and v3 /
`25_25_25_25`: HP and three-day trial retain their collected results, while v2's
`trial_7d` joins the current seven-day presentation. The mascot remains separate.
Each release must still match its original experiment ID, allocation and allowed
variants; no saved assignments or timestamps are rewritten. The same pooling
applies to country slices and the paywall experiment report. Until a new flow
enrolls users, only its row remains empty. These are pooled results across release
periods, rather than a comparison restricted to concurrent four-way assignments.
There is no price-point comparison. Both tables use first installs
on v1.1.5 or newer, across all time and all languages/countries. Later upgrades
do not reenroll older installs, and unknown first versions are excluded. The
date picker still controls the overview, App versions and country charts. Explicit production markers
are required; legacy offer assignments are excluded. All assigned nonpayers count,
and outcomes follow through report time after both install and assignment,
including linked renewals/refunds. APPU, lift, Win %, trial conversion, paid
conversion and transaction-count refund rate reuse the other compact tables.

The new seven-day SKU is `arthurbuildsstuff.peptides.yearly.trial7`. Its annual
price and every localized storefront price must match the existing three-day
`arthurbuildsstuff.peptides.yearly.trial` SKU; HP's existing regional prices stay
unchanged. Configure a seven-day free introductory offer before releasing the app.
The app validates the assigned SKU and trial period, uses StoreKit's localized
prices, and keeps existing v1 assignments/timestamps intact. The seven-day preview
shows its own introduction, dated reminder and annual timeline/paywall screenshots,
using Poky’s rounded font and selected-compound headline. Poky snapshot keys include
`offer-merged-flows` so old cached reports cannot
hide the waiting rows. Dashboard deployment and iOS release are separate steps.

The app detail page now shows the overview and compact tables directly, without
the Data / AB tests / Paywalls selector or its deferred report requests. The
underlying detailed report modules and authenticated API remain available.

### Country selector

App detail has All countries plus the three known countries with the most unique
first installs in that app’s minimum-version cohort, ranked by installs with country
code as the tie-breaker. All countries also includes smaller/unknown countries.
Country is frozen on the earliest production device-attributes event. The selector
updates the overview and date-window charts, App versions, onboarding, paywall/price
tables, screen-funnel modals and Trial survival together. Version cutoffs and
maturity rules remain unchanged. A country with no installs in the selected date
window stays empty in the overview; it never falls back to global totals.

Only aggregate reports for the top three countries reach the browser. Journey
queries group by first country and version before summing the All countries report;
no proportional allocation or user-level records are used. Subscription-chain
ownership retains anonymous renewals/refunds in the original install country.

The bottom country breakdowns are fixed to **APPU** (net proceeds / tracked
installs, sorted by APPU) and **Downloads → Paid** (paid users / tracked installs,
sorted by paid conversion). These are the only two bottom cards in all three apps;
weekly/yearly and subscription-retention cards are no longer shown. The country
selector and Glow’s 72-hour maturity rule still apply. Both bottom cards use a
fixed rolling 30-day install window, independent of the page date picker, and are
labelled Last 30 days. The minimum of 50 installs applies within that window.

Both bottom country tables require at least 50 installs in their selected cohort;
this applies before sorting and to the full detail lists as well as previews.

The APPU card uses double bars: installs in blue and APPU in orange, each scaled
to that metric’s maximum among displayed countries. Its value label remains APPU.

Poky temporarily forces the native hard paywall for the US App Store storefront through October 25, 2026 inclusive (device-local cutoff: October 26 at midnight). It prominently shows the annual total and preserves regional SKU pricing. Saved random assignments remain immutable, but users exposed to the override have sticky `poky_us_hp_override_seen=true` and are excluded from both current and historical randomized offer comparisons. Forced views and purchases use separate nonrandomized `poky_us_hp_until_2026_10_25_<language>` native records. The normal routing resumes after the cutoff.


### Seven-day mascot presentation

The v3 `trial_7d` and `trial_7d_mascot` assignments share the exact same
`arthurbuildsstuff.peptides.yearly.trial7` product, localized price, two-day reminder
lead and final annual timeline/paywall. The mascot arm uses the existing onboarding
speech bubbles, bundled `PokyPlanLoop` introduction and `PokyTrialReminderLoop` bell
video; the current arm retains the centered text screens. Clicking each table row
opens its own three-screen preview. Never infer the presentation from the shared
SKU: its immutable offer assignment identifies the cohort, including nonviewers and
nonpayers. Saved v1/v2 assignments and native purchase attribution remain unchanged.
The temporary US override still takes priority and exposed users remain excluded.


## October 23, 2026: annual 3-day / 7-day trials

Glow uses `glow.paywall.assignment.v5` / `native_yearly_prices_v5` for fresh assignments:
`yr_34`, `yr_49`, `yr_59` are the existing 7-day offers; `yr_34_3d`, `yr_49_3d`,
`yr_59_3d` use the respective product IDs with `.trial3` appended. Each receives 1/6,
so each duration receives 50% at each price. Existing v4 assignments are loaded unchanged.

Versy's proposed v4 trial-duration test was removed on October 26 before release.
The active app assignment remains `versy.paywall.yearlyPrice.assignment.v3` /
`versy_yearly_price_v3`, allocation `50_50`: $39.99 and $49.99, both with 7-day trials.
The analytics price and widget-combination rows exclude all `.trial3` assignments.
Matching seven-day v4 history is accepted defensively if present; migrated, development,
unknown-product and mismatched allocations remain excluded. Country slices use the same rules.
Historical transactions and purchase attribution records are not deleted.

Glow warms every annual SKU before onboarding. Selection never substitutes a different
price or duration if Apple has not returned the assigned product. StoreKit's actual intro
offer drives the rendered duration; the assignment supplies a matching 3/7-day fallback
while loading. Standard flows remind 2 days before expiry (day 1 or 5). Choice flows offer
1/2 days before a 3-day expiry and 2/3 before a 7-day expiry. Scheduled notifications use
verified Apple trial expiry; paid/ineligible purchases do not schedule a trial reminder.
Versy retains its original seven-day product preload and reminder setup.

App Store Connect creation clones each source's current non-preserved annual price in all
175 territories, availability and product localizations. Each new product has a THREE_DAYS
FREE_TRIAL offer in those same 175 territories. Original prices and intro offers are unchanged.
These new subscriptions must pass Apple's review and become available before shipping the new app builds.

Creation IDs and final Apple verification are recorded in [`glow-versy-trial3-products.json`](glow-versy-trial3-products.json). All five were `READY_TO_SUBMIT` with completed review images on October 23, 2026.

## October 26, 2026: Versy hard/dismissible comparison

The Versy Data tab includes `Hard Widget`, `Dismissible Widget`, and `Bible Scroll` for
saved seven-day price assignments. Full and Shorter Widget are pooled by their saved
access mode; Bible Scroll is always dismissible regardless of its unrelated access draw.
Membership requires production tracking, first install on 1.2.6+, current onboarding
experiment, matching known non-Mexico install/reported country, and a valid price assignment.
Nonpayers remain in the denominator. Results include historical allocation mixes and are
descriptive; no winner badge is inferred across these grouped flows.

The report also computes 24h/48h checkpoints, which are not displayed in the Data tab.
The checkpoint calculation starts the clock at the later of first install and price
assignment. Only fully observed users enter each checkpoint. Trial starts, cancellations,
expiry and direct payments are evaluated as they stood at that point, using the original
transaction chain to retain anonymous follow-ups. Uncancelled trial or paid counts users
once and is an early signal, not a prediction of eventual paid conversion. Trial-to-paid
in the standard comparison still requires trials whose recorded expiry has passed.
Country filters rebuild the same aggregates. `lib/versy-paywall-comparison.ts` owns this
calculation; no new analytics ingestion or database is introduced.
Attribute loads split saturated queries into disjoint key batches, retaining all users
instead of serving truncated cohorts. A saturated single key still fails explicitly.
