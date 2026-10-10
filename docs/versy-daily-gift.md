# Versy daily gift

The updated app presents a native two-step full-screen gift after its first recorded
24 hours, on the first eligible foreground visit of each local calendar day.
Premium users are excluded after entitlement refresh. Temporary inactive states
and purchase sheets do not create another visit. Existing installs begin the grace
period when they first run this version. Presentation waits for Home and other
modals to finish.

## Tracking contract

Uses the same Superwall scalar `gp1_` ledger and Apple Query API as Poky. There
are no new Superwall campaigns, remote placements, ingestion routes or database
tables. The rollout has its own immutable identity:

- Experiment: `versy_daily_gift_v1`, nonrandomized, one variant.
- Variant and paywall: `daily_gift` (Daily gift).
- Placement: `daily_gift_app_open`.
- Only allowed product: `com.arthurbuildsstuff.bible.YearlyDiscount`.
- Language freezes on first reach: `en`, `es`, `pt`, or `de`.

The sealed envelope's actual appearance enrolls the user and records reach.
Completing the reveal animation records the first offer view; Reduce Motion records
it immediately. Product-load retries fill the displayed product without changing
first timestamps. Daily openings and Debug replay do not create extra unique users.
The standard `paywall_viewed` event is emitted for the revealed step, alongside
`daily_gift_viewed`, `daily_gift_revealed` and `daily_gift_dismissed` events with the
same placement. The existing purchase-attempt/result events retain that placement.

A purchase attempt persists the gift context before StoreKit. Pending approvals
survive restart, and only verified new purchases resolve them. Automatic renewals,
restores, Family Sharing, revoked transactions and duplicate updates do not become
new conversions. Apple's integration supplies USD proceeds; renewals/refunds follow
the immutable original purchase. Debug/development and sandbox records are excluded.

Historical `app_open` records and onboarding-route assignments remain untouched.
The daily gift's proceeds appear only in its own native paywall group, not again
in the onboarding-route native group. The separate onboarding A/B outcome reports
continue to use their existing all-revenue queries. Never add overlapping report
tables together as if they were independent totals.

## Dashboard

`/analytics` → Versy → Paywalls shows the Daily gift group through the existing
native report loader, including all four language audiences, reached users, revealed
views, conversions, paid users, proceeds, refunds and APPU. Its 100% badge describes
configuration, not observed traffic; it does not add an A/B test or winner estimate.
The app map explains its daily schedule and independent discounted SKU. The legacy
PostHog placement table includes both old and new IDs.

## Verification, October 10, 2026

Focused dashboard tests cover the sealed/nonpayer denominator, reveal, purchase,
renewal, refund deduplication, historical separation, all languages and debug/sandbox
exclusion. The read-only `check-native-paywall-tracking.ts --app=versy` returned
`ready` with no warnings and found Apple initial-purchase, renewal and refund events.
No production gp1 cohorts exist yet; production gift data requires shipping the
updated iOS app. A real TestFlight/sandbox purchase lifecycle has not been performed
as part of this UI change. Unit tests and a live read-only query do not establish
that end-to-end purchase verification.
