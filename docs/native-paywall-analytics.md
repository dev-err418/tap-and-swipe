# Native paywall analytics (Glow and Poky)

## Architecture and constraints

Glow and Poky render native SwiftUI paywalls and hardcode their experiments/traffic splits. Superwall is used only for purchase/subscription infrastructure and custom user-attribute storage. **Do not add Superwall campaigns, placement registration, presentation-result calls, or remotely configured experiments.** No D1/PostgreSQL tables, ingestion routes, or webhook receivers are needed for this feature.

The dashboard's existing server-side Superwall Query API connection reads these records. Never expose `SUPERWALL_GLOW_API_KEY` to the browser or the iOS app. Queries use organization 27020/application 54736, production data only. The existing 90-second analytics cache also caches this report.

Related app files (in the sibling `glow-app/glow-app` repo):

- `native/Glow/NativePaywallAnalytics.swift`: persisted local state, scalar-JSON attributes, transaction observer.
- `native/Glow/GlowProductID.swift`: `GlowPaywallVariant` and persisted `GlowPaywallAssignment`, active v2 25/25/50 split; historical v1 helpers are retained but no longer drive presentation.
- `native/Glow/SuperwallService.swift`: custom entry-point reach/dismiss hooks; no SDK placement registration.
- `native/Glow/Views/GlowPaywallView.swift`: actual appearance hook.
- `native/Glow/GlowSubscriptionStore.swift`: capture purchase attempt/result.
- `native/PAYWALL-ANALYTICS.md`: app-side contract and extension instructions.

Dashboard files:

- `lib/native-paywall-queries.ts`: paginated attribute fetch, authoritative money queries.
- `lib/native-paywall-analytics.ts`: validation, attribution, cohort aggregation and statistics (pure/testable).
- `lib/native-paywall-allocation.ts`: mirrors the hardcoded next-release experiment `native_paywalls_v2`: `yr_49` 25%, `yr_59` 25%, `yr_wk_59` 50%. Variant and paywall identity are the same stable string. Historical `native_yearly_v1` stays Annual/Pro yearly 50/50. Supports both demo variant IDs and live composite `variant|paywall` row IDs. Unknown allocations are omitted, never inferred from user counts. Badges describe code configuration, not observed traffic, remote configuration or confirmation of an App Store rollout.
- `components/analytics/NativePaywallsPanel.tsx`: language audience filter, all experiment groups, paywall/placement tables.
- `lib/mobile-app-analytics.ts`: loads this report for Glow and Poky's detail views.

Poky uses the same contract from `peptides/Subscription/PokyNativePaywallAnalytics.swift`.
Its stable per-language experiments use `poky_native_main_v1_<language>`
(English/fallback High/Name 50/50; German, Spanish, and French Name 100%) and
`poky_native_recovery_v1_<language>` (Recovery/holdout 50/50). The suffix keeps
an app-language change from overwriting or mislabeling the earlier audience.
Automatic recovery is once-ever and evaluated after
a main purchase cancellation or main-paywall decline, independent of origin
placement. `poky_context_recovery_v1_<language>` reports the separate explicit home-screen
shortcut, which is always Recovery and does not consume automatic recovery.

Poky enrols non-premium users during splash, after entitlement refresh; the actual
production view's appearance hook records views. Debug previews do not enrol
production users. See Poky's `docs/NATIVE-PAYWALL-TRACKING.md` for the app-side lifecycle.

### Recovery and onboarding A/B reporting

`lib/poky-native-recovery.ts` powers the native Recovery vs Holdout card in AB
tests. It reads the four `gp1_a_poky_native_recovery_v1_<language>` attributes,
deduplicates first eligibility per user across language changes, and measures
**all** subsequent server proceeds for both arms. Later main-paywall purchases
by a holdout count. The date filter selects eligibility, while outcomes follow
the cohort through today; D7/D14/D30 include only fully observed users. The old
Superwall recovery card and trigger queries have been removed; historical
campaign results are neither displayed nor mixed into the hardcoded experiment.
The underlying historical source records are not deleted.

Result cards follow the flow map from top to bottom (`lib/app-experiment-order.ts`):
Glow onboarding → paywall comparison → yearly price; Poky app experience → plan
flow → combined onboarding results → native recovery. Recovery nodes use the
native experiment's `recovery` / `holdout` assignments for their result badges.

The Paywalls tab is **direct purchase attribution**, not the causal recovery
experiment: a recovery purchase credits recovery, not the earlier main view.
Its recovery winner probability is deliberately disabled; use the AB card.
Never fabricate recovery views for holdouts to make their outcomes appear.

Fresh onboarding/background assignments publish `onboarding_plan_allocation`
and `home_experience_allocation` as `50_50`. Inherited assignments are `legacy`.
The current plan/home tests require their fresh marker, and the four-way table
requires both. Old assignments remain sticky but are excluded from these new
cohorts; missing markers are never inferred to mean 50/50. Historical raw
attributes remain stored. Do not lowercase attribute JSON during parsing.
Current Poky onboarding reports also require `poky_tracking_environment=production`,
so Debug overrides cannot contaminate them even before the SDK labels a user sandbox.

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
does **not** prove the unreleased native purchase path end-to-end. After deploying
the dashboard and shipping the app, verify a native transaction's immutable
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
  "experiment": "native_paywalls_v2",
  "experimentName": "Native paywalls · 25/25/50",
  "variant": "yr_wk_59",
  "variantName": "yr_wk_59",
  "paywall": "yr_wk_59",
  "language": "en",
  "assignedAt": 1790000000000,
  "randomized": true,
  "variantCount": 3,
  "expectedProduct": "com.arthurbuildsstuff.glow.pro.yearly",
  "allowedProducts": ["com.arthurbuildsstuff.glow.pro.yearly", "com.arthurbuildsstuff.glow.Weekly"],
  "viewedAt": 1790000030000,
  "displayedProduct": "com.arthurbuildsstuff.glow.pro.yearly"
}
```

Placement records add `placement` and `reachedAt`. `expectedProduct` is the default product; `allowedProducts` lists valid offers in the assigned design. It is optional for backward compatibility: missing means `[expectedProduct]`. The list is inside the scalar JSON string, never a raw Superwall attribute array. `hadFallback: true` persists if a presentation selects a SKU outside that set. A Weekly purchase from `yr_wk_59` remains a valid conversion for that design, not contamination. Purchase payloads contain `context` (a copy of the placement record with the current selected product), `productID`, `startedAt`, `transactionID`, `originalTransactionID`, and `purchasedAt`. All times are UTC Unix milliseconds; transaction IDs are decimal **strings**, never JS numbers. IDs for experiments/variants/paywalls/placements use lowercase ASCII letters, digits and underscores (max 100 characters).

V2 is assigned on the first launch of the new build and persists variant, time and language together in `glow.paywall.assignment.v2`; reporting publishes it after SDK startup for unsubscribed users. Existing installs get a fresh randomized v2 assignment too, so this is not exclusively a first-install cohort. Existing subscriptions are unchanged. The old `glow.paywall.yearly.v1` bucket, historical v1 records and pending purchase contexts remain untouched. V1 records predating timestamp tracking remain `randomized: false`; v2 never rewrites or backdates them. Already subscribed users are not newly enrolled in reporting at startup. Views mean **unique people**, not repeated impressions; a placement reach does not imply a view.

Language comes from Glow's resolved app localization and freezes at assignment. Later language changes do not move historical results into another audience. A new experiment needs a new ID; never overwrite old assignments to restart a test. V2 tests both price anchors and the new Yearly/Weekly design. The same assigned variant appears at every placement, full-screen for onboarding and modal otherwise. `yr_59` and `yr_wk_59` remain separate even when both sell Pro Yearly; never infer the design from SKU. Legacy `themes_upgrade_top_card` remains a valid ID but has no active card in the current app UI.

## Purchase, renewal, refund attribution

1. Before purchase, Glow durably saves the current native presentation and product as an attempt. Cancellation/failure clears it; `.pending` keeps it across app restarts. Another purchase of that product cannot overwrite a pending attempt.
2. The StoreKit purchase result and a read-only `Transaction.updates` observer reconcile **verified, non-revoked, explicit purchase** transactions against the matching product and attempt start timestamp. Restores of older transactions and automatic renewals cannot consume an attempt. Startup reconciles pending attempts with `Transaction.latest(for:)`.
3. A successful match publishes `gp1_t_<transactionID>` through normal Superwall attributes. It does not modify access or finish the transaction; Superwall remains responsible for that.
4. The dashboard joins this record to Superwall's Apple integration events by original transaction ID. An exact purchase transaction wins; renewals follow the latest preceding purchase anchor in that subscription chain. Refunds use the charged transaction's purchase date/ID so a late refund cannot be reassigned to a later paywall.
5. Only server integration money events are summed. SDK transaction completions are not counted again. Deliveries are deduplicated by original transaction ID + transaction ID + charge/refund direction, preferring the latest attribution revision.

**Refunds may be `cancellation` events with `isRefund = 1`.** Ordinary cancellations have no money effect. Refund revenue/proceeds are normalized negative for net proceeds; the Refunds column shows positive refunded customer revenue. Customer revenue and proceeds are not interchangeable.

September 19, 2026 validation: live Glow data contains original transaction IDs for initial purchases, renewals and refunds; refunds were observed as cancellation events. Native 1.7.0 transactions contain custom attribute snapshots despite having no Superwall paywall/placement attribution. SDK 4.16.3 merges attributes on a serial queue and synchronizes reads through `userAttributes`. These facts support the design; the new gp1 flow still requires device/sandbox lifecycle verification after release preparation. Automated tests exercise delayed approvals/relaunches, original-placement preservation, renewal/refund joins and duplicate delivery. No production purchases were generated for testing.

## Metric definitions

The dashboard date filter selects **assignment time**. Outcomes are followed through report `asOf` (now), even when the selected cohort period ended earlier. Both tables use that same cohort. Placement rows include only cohort members reaching that placement and can overlap in users; each transaction is attributed to one placement.

- **Users:** all assigned users for a paywall; assigned users who reached a particular placement for placement rows.
- **Views:** unique users actually shown that paywall/placement. Repeated openings count once.
- **Conversions:** unique users with a verified attributed purchase, including free trial starts. Renewals/restores are not new conversions. The number can lead Apple's server event delivery.
- **Conv. rate:** conversions / unique viewers. Its whisker is a 95% frequentist confidence interval over the aggregate cohort, not the minimum and maximum observed daily rate. The UI uses a Wilson score interval because Superwall documents the confidence level and interpretation but does not publish its exact formula; treat it as a close statistical analogue, not an exact reproduction of their private calculation. The conversion cell also exposes the distinct paid-user count.
- **Proceeds:** net USD proceeds after fees/taxes and refunds, including renewals attributed to that origin.
- **APPU:** net proceeds / all Users, including zero-paying users.
- **Estimated APPU D7/D14/D30:** sample mean of each mature user's net proceeds during the first N days after assignment. Zero-paying users stay in the denominator. This estimates a fixed-age cohort mean; **it does not forecast lifetime value or pending-trial conversions**. Refunds occurring after day N affect overall proceeds but not historical day-N proceeds.
- **Probability best:** approximate chance of highest fixed-age APPU across variants of the same experiment/audience. Normal sampling uses the actual per-user sample variance, including zeroes and refunded amounts. The zero-centered orange/blue bar beneath it is the 95% uncertainty interval for APPU lift versus the first/control paywall arm, matching the existing A/B-test presentation. Requires all expected variants, >=50 mature users and >=5 paid users per variant. Suppressed for inherited assignments, fallback products, incomplete money data, or insufficient samples. These are model-based estimates, not guarantees or a sequential-testing stopping rule.
- **Refunds:** absolute refunded customer revenue in USD.
- **Refund rate:** refunded customer revenue / gross customer revenue before refunds; not refund count / conversions, and not refunded revenue / net proceeds.

Placements are not randomized arms. Their estimated APPU is descriptive; their Probability best stays blank with an explanation. Summing paywall rows within one experiment is valid; summing different experiments or placement user counts can double-count people.

## Limits and failure behavior

- Historical pre-instrumentation views/placements cannot be reconstructed; keep them untracked.
- Local persistence is scoped to Superwall identity and build environment. Uninstall/reset loses local pending attempts; there is no cross-device assignment synchronization. Do not introduce login/identity switching without designing migration.
- Client analytics is not an entitlement authority. Purchase outcomes/revenue must continue to use verified StoreKit/server events.
- We store first views, not an event log of every impression. Arbitrary daily repeat-impression reporting is unsupported.
- Superwall delivery is asynchronous. A purchase whose attribution pointer has not uploaded yet will appear later. If the app never resumes to observe a deferred approval, that attribution is not guaranteed until it does.
- Attributes are paginated. Reaching 200,000 records, a transaction batch exceeding 50,000 rows, or a query failure shows unavailable rather than silently biased zero/partial results. Retention/rate limits remain Superwall's; no independent warehouse copy is maintained.
- Development/sandbox records and malformed schemas are excluded. Malformed or missing monetary data produces visible warnings.
- Do not change the generic AB-tests statistics as part of this feature; this panel uses its own user-level variance calculation. The older native-vs-web version comparison remains separate and is not a randomized experiment.

## Verification

```sh
npx tsx --test scripts/tests/native-paywall-analytics.test.ts
npx tsc --noEmit
npx eslint lib/native-paywall-analytics.ts lib/native-paywall-queries.ts components/analytics/NativePaywallsPanel.tsx
npm run build
```

For a new app release: verify first assignment without a view, repeated views, two entry points, purchase/cancel, Ask to Buy across restart, restore, renewal, refund and language change in sandbox. Confirm `gp1_` fields in Superwall and exclusion from production reporting. Do not fabricate old timestamps or sample production rows to populate an empty dashboard.

Sources: [attributes](https://superwall.com/docs/ios/sdk-reference/setUserAttributes), [Query API](https://superwall.com/docs/dashboard/guides/query-clickhouse), [direct purchases](https://superwall.com/docs/ios/guides/advanced/direct-purchasing), [pricing](https://superwall.com/pricing). Published pricing bills Superwall-rendered paywall revenue; this implementation does not render or register their paywalls. Historical Superwall-attributed subscriptions remain historical and are not rewritten.
# Poky: Superwall vs native migration comparison

The A/B tests tab also includes one historical comparison card, **Conversion rate · Superwall vs native**, between installs on versions before 1.1.2 and installs on 1.1.2+. This is observational, not a currently randomized allocation, so it is intentionally omitted from the live experiment-allocation map.

The card has separate Spanish total APPU and English total APPU analyses/columns, plus the combined EN/ES download-to-paid comparison. Language comes from the earliest install-cohort device event's `meta.deviceLanguageCode`, not IP country. Regional Spanish codes are grouped into Spanish; other known unsupported languages follow Poky's English fallback. German, French, missing/malformed languages, and unparseable versions are excluded. Country filtering applies to both the language numerator and denominator.

The dashboard date picker selects the **install cohort**. Total APPU is all observed net proceeds through the current time divided by all installed users in that language/version cohort, including non-payers. All products/placements, renewals, recovery revenue and refunds are included; transactions are deduplicated and paid counts are unique users. Later upgrades do not move a user or their renewals into the native install cohort. This measures install-version cohorts, not proof of which paywall each transaction displayed. Cohorts have different ages/traffic and are not a causal lift estimate. Unknown/sandbox telemetry is not filled with demo data.
