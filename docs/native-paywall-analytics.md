# Native paywall analytics (Glow)

## Architecture and constraints

Glow renders native SwiftUI paywalls and hardcodes its experiments/traffic splits. Superwall is used only for purchase/subscription infrastructure and custom user-attribute storage. **Do not add Superwall campaigns, placement registration, presentation-result calls, or remotely configured experiments.** No D1/PostgreSQL tables, ingestion routes, or webhook receivers are needed for this feature.

The dashboard's existing server-side Superwall Query API connection reads these records. Never expose `SUPERWALL_GLOW_API_KEY` to the browser or the iOS app. Queries use organization 27020/application 54736, production data only. The existing 90-second analytics cache also caches this report.

Related app files (in the sibling `glow-app/glow-app` repo):

- `native/Glow/NativePaywallAnalytics.swift`: persisted local state, scalar-JSON attributes, transaction observer.
- `native/Glow/GlowProductID.swift`: existing sticky yearly product assignment, unchanged 50/50 split.
- `native/Glow/SuperwallService.swift`: custom entry-point reach/dismiss hooks; no SDK placement registration.
- `native/Glow/Views/GlowPaywallView.swift`: actual appearance hook.
- `native/Glow/GlowSubscriptionStore.swift`: capture purchase attempt/result.
- `native/PAYWALL-ANALYTICS.md`: app-side contract and extension instructions.

Dashboard files:

- `lib/native-paywall-queries.ts`: paginated attribute fetch, authoritative money queries.
- `lib/native-paywall-analytics.ts`: validation, attribution, cohort aggregation and statistics (pure/testable).
- `components/analytics/NativePaywallsPanel.tsx`: language audience filter, experiment selector, paywall/placement tables.
- `lib/mobile-app-analytics.ts`: loads this report only for Glow's detail view.

## Storage contract: gp1

### Temporary UI demo mode

The Paywalls panel currently opens in **Demo data** mode for design work. `lib/native-paywall-demo.ts` supplies seeded, fictional numbers for both yearly variants, English/Spanish/German audiences, and six placements. The banner explicitly labels the data; **Show live data** switches back to the real report without mixing sources. The main chart remains live, and date filters do not affect demo rows. No sample records are sent to Superwall or stored in a database. Before normal analytics use, change the panel's `demo` state default to `false` (or remove the preview toggle and fixture). Demo winner percentages are illustrative, not statistical results.

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
  "experiment": "native_yearly_v1",
  "experimentName": "Native yearly offer",
  "variant": "annual",
  "variantName": "Annual",
  "paywall": "native_timeline_annual_v1",
  "language": "en",
  "assignedAt": 1790000000000,
  "randomized": true,
  "variantCount": 2,
  "expectedProduct": "com.arthurbuildsstuff.glow.Annual",
  "viewedAt": 1790000030000,
  "displayedProduct": "com.arthurbuildsstuff.glow.Annual"
}
```

Placement records add `placement` and `reachedAt`. `hadFallback: true` persists if any presentation offered a SKU other than the assigned product, even after an earlier correct view. Purchase payloads contain `context` (a copy of the placement record), `productID`, `startedAt`, `transactionID`, `originalTransactionID`, and `purchasedAt`. All times are UTC Unix milliseconds; transaction IDs are decimal **strings**, never JS numbers. IDs for experiments/variants/paywalls/placements use lowercase ASCII letters, digits and underscores (max 100 characters).

An assignment starts when an unsubscribed user first runs the instrumented app. It is **not** backdated to install or to an older untracked assignment. Existing yearly SKU assignments are preserved and tagged `randomized: false` if they predate timestamp tracking; they are descriptive cohorts, not fresh randomized test participants. Already subscribed users are not newly enrolled at startup. Views mean **unique people**, not repeated impressions; a placement reach does not imply a view.

Language comes from Glow's resolved app localization and freezes at assignment. Later language changes do not move historical results into another audience. A new experiment needs a new ID; never overwrite old assignments to restart a test. The currently instrumented experiment is the existing Annual/Pro yearly offer split, not a newly invented design test.

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
- **Probability best:** approximate chance of highest fixed-age APPU across variants of the same experiment/audience. Normal sampling uses the actual per-user sample variance, including zeroes and refunded amounts. Requires all expected variants, >=50 mature users and >=5 paid users per variant. Suppressed for inherited assignments, fallback products, incomplete money data, or insufficient samples. These are model-based estimates, not guarantees or a sequential-testing stopping rule.
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
