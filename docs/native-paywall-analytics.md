# Native paywall analytics (Glow and Poky)

Glow's separate [Journal VS Practice](journal-practice-experiment.md) activity experiment uses `gjp1_journal_vs_practice_v1`. It does not alter the paywall ledger or purchase attribution described here.

## Architecture and constraints

Glow and Poky render native SwiftUI paywalls and hardcode their experiments/traffic splits. Superwall is used only for purchase/subscription infrastructure and custom user-attribute storage. **Do not add Superwall campaigns, placement registration, presentation-result calls, or remotely configured experiments.** No D1/PostgreSQL tables, ingestion routes, or webhook receivers are needed for this feature.

The dashboard's existing server-side Superwall Query API connection reads these records. Never expose `SUPERWALL_GLOW_API_KEY` to the browser or the iOS app. Queries use organization 27020/application 54736, production data only. The existing 90-second analytics cache also caches this report.

Related app files (in the sibling `glow-app/glow-app` repo):

- `native/Glow/NativePaywallAnalytics.swift`: persisted local state, scalar-JSON attributes, transaction observer.
- `native/Glow/GlowProductID.swift`: `GlowPaywallVariant` and persisted `GlowPaywallAssignment`, active v3 five-variant split; historical v1 helpers are retained but no longer drive presentation.
- `native/Glow/SuperwallService.swift`: custom entry-point reach/dismiss hooks; no SDK placement registration.
- `native/Glow/Views/GlowPaywallView.swift`: actual appearance hook.
- `native/Glow/GlowSubscriptionStore.swift`: capture purchase attempt/result.
- `native/PAYWALL-ANALYTICS.md`: app-side contract and extension instructions.

From October 7 through October 11, 2026, US/USA users receive yearly-only native paywalls in every language. The existing geo lookup resolves before startup product loading and analytics; non-US and unknown-country users retain their normal assignment. Package variants map to their yearly-only counterpart while preserving the assigned annual product and price. The saved v3 assignment is unchanged, and regular presentation resumes at local midnight October 12. Manual Debug design previews remain isolated. These presentations use the separate nonrandomized `native_paywall_us_yearly_oct2026` analytics experiment with `yr_49`, `yr_59`, or `yr_34` and only the matching yearly SKU in `allowedProducts`; do not mix them into the v3 randomized comparison. No fixed allocation badges are assigned to this temporary geographic cohort. Glow recovery offers also remain restricted to known non-US users through October 11; all countries, including unknown-country users, become eligible at local midnight October 12, 2026.

Dashboard files:

- `lib/native-paywall-queries.ts`: paginated attribute fetch, authoritative money queries.
- `lib/native-paywall-analytics.ts`: validation, attribution, cohort aggregation and statistics (pure/testable).
- `lib/native-paywall-allocation.ts`: mirrors the released Glow 1.7.2 experiment `native_paywalls_v3`: `yr_wk_59` and `yr_wk_34` receive 25% each; `yr_49`, `yr_59` and `yr_34` share the remaining 50% equally (exactly 1/6 each, displayed as ~17%). Variant and paywall identity are the same stable string. The temporary English presentation uses the separate, nonrandomized `native_paywall_legacy_en_sep2026` experiment with `yr_59` at 100%. Historical `native_yearly_v1` stays Annual/Pro yearly 50/50, and `native_paywalls_v2` retains its 25/25/50 allocation. Supports both demo variant IDs and live composite `variant|paywall` row IDs. Unknown allocations are omitted, never inferred from user counts. Badges describe code configuration, not observed traffic.
- `components/analytics/NativePaywallsPanel.tsx`: language audience filter, all experiment groups, paywall/placement tables.
- `lib/mobile-app-analytics.ts`: loads this report for Glow and Poky's detail views.

Poky uses the same contract from `peptides/Subscription/PokyNativePaywallAnalytics.swift`.
Its new onboarding offer test assigns fresh installs 50/50 to the current flow
or one hardcoded three-day trial paywall. The trial purchase and restore use
StoreKit directly; Superwall observer mode supplies transaction association,
analytics attributes and subscription state, but no trial paywall campaign or
placement is registered. The trial arm
does not enter the High/Name or recovery tests. The primary
`poky-trial-vs-current` card reads the scalar onboarding offer assignment,
counts assigned nonviewers, free trial starts, later paid renewals and refunds,
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

The AB tests and Paywalls tabs always use a rolling **30-day assignment cohort**, independently of the dashboard period selector used by the Data tab and overview charts. Outcomes are followed through report `asOf` (now), even when the cohort period ended earlier. Both paywall tables use that same 30-day cohort. Placement rows include only cohort members reaching that placement and can overlap in users; each transaction is attributed to one placement.

### App version comparison

The Data, AB tests, and Paywalls tabs can compare a selected app version. A user's **first recorded version on a production `device_attributes` event** fixes their cohort: versions below the selected version are Before, and the selected version or newer are After. Versions are compared by numeric components, so 1.10 is newer than 1.9. Missing or malformed first versions are excluded from both sides; they are not inferred from later upgrades. The Data comparison follows the selected dashboard period, while AB tests, native paywalls, and win-back offers retain their rolling 30-day cohorts. The difference column is After minus Before; rate differences are percentage points. These version cohorts are observational and do not imply that a release caused a change or establish an A/B winner. Native paywall, Journal VS Practice, and win-back comparisons resolve first versions for assigned or viewing users even if they installed before the report window. Win-back remains a separate PostHog view-to-purchase report with no revenue or refund attribution.

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

The Paywalls tab also shows a separate **50% win-back offer** section for Glow and Versy. It reads production PostHog `winback_paywall_viewed` and verified `winback_purchase_completed` events for the last 30 days. A conversion is a distinct viewer who later bought the same yearly product from the same source within that window. Glow purchase events join by `original_product_id` because the discounted SKU differs; Versy joins by `product_id` because the promotion uses the original SKU. The panel breaks out source and yearly product. This is a view-to-purchase rate, separate from the regular native paywall experiment and its APPU, proceeds, and refunds. The dashboard does not attribute revenue or refunds to this offer. No production views show an empty state; read failures and the 20,000-group safety limit show unavailable instead of a partial rate.

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
