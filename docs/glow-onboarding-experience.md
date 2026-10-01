# Glow onboarding experience reporting

Prepared experiment: **30% Current / 70% No mascot**. Production enrollment is off until the complete mascot-free treatment is implemented. The existing IAM/Copy report remains a separate historical comparison; new experiment members are excluded from it.

App contract: `native/ONBOARDING-EXPERIENCE-EXPERIMENT.md` in Glow. ID `onboarding_mascot_v1`, scalar JSON attribute `goe1_onboarding_mascot_v1`, schema 1, allocation `30_70`. Variants are `current` and `mascot_free`. Store immutable assignment time, language and environment with cumulative day-0–30 session counts and optional onboarding completion time. New randomized users only; completed and legacy users are excluded. Debug/sandbox/forced records cannot enter the production comparison.

## Metrics

The Glow A/B tests tab and experiment-map detail show assigned users, onboarding completion, net proceeds, **ARPU**, **sessions / user / day**, and **average time to cancel**.

- ARPU = all authoritative net proceeds after assignment / all assigned users, including non-payers and unfinished onboarding. Uses the existing USD proceeds basis. Includes charges, renewals, non-renewing purchases and refunds. Ordinary subscription cancellation does not subtract revenue. Deduplicate transaction/refund identities using the latest attribution revision. Variance is calculated across per-user totals including zeros, for the existing ARPU comparison gates.
- Sessions / user / day = total sessions / total observed user-days, including inactive users/days. The app tracks cold launches and returns after at least 30 minutes in the background. Uses Poky's observed-person-day calculation; numerator and denominator cover the first 31 days after assignment. Different cohort ages contribute their actual observation time, not an equal per-user rate or a paid-only denominator. Very recent cohorts can have unstable rates.
- Average time to cancel = mean duration from a user's first post-assignment subscription/trial start to its first subscription cancellation. Each cancelled user contributes once. Renewals do not restart the clock; a later subscription does not replace the first. Active subscriptions and refunds are excluded. Show the cancellation sample size; no cancellations means unavailable duration, not zero. This is descriptive among cancelled users, not a survival estimate or an average expected subscription lifetime.

The reporting range selects assignment dates and follows their outcomes through the snapshot time. The A/B tab loads the existing last-30-days bundle. No initial production users or synthetic outcomes are created.

## Data and failure behavior

`loadGlowOnboardingExperience` uses the existing server-only Superwall Query API credentials and application ID. Fetch assignment records and existing `gp1_t_` verified purchase pointers using keyset pagination. Fetch production integration revenue and cancellation events by cohort user identity in bounded chunks, excluding Family Sharing. There is no product/placement restriction on user outcomes and no new database, ingestion endpoint, campaign or remote SDK placement.

Reject malformed/conflicting assignments and warn rather than combining them with the legacy copy test. Missing authoritative money, invalid transaction identities or verified purchases awaiting matching server charges withhold ARPU. Cancellations missing matching valid starts withhold cancellation timing. Query failures and reporting limits return unavailable data rather than partial cohorts or false zeros. Session reporting remains usable when revenue alone is incomplete.

The experience comparison combines assignment languages; the map's paywall-language control does not change its cohort. Legacy localized experiment and paywall comparisons retain their audience filtering.

## Validation and activation

Run `scripts/tests/glow-onboarding-experience.test.ts` plus the map/detail and session-rate fixtures, TypeScript, focused ESLint and the production build. Fixtures cover non-payers, duplicate charges/refunds/cancellations, renewal attribution, cancellation timing, active users, missing starts/money, pending server charges, sandbox/forced users, cohort boundaries, unequal observation windows and unavailable UI states.

Deploy this dashboard support before the instrumented app. After all treatment screens are complete and reviewed, enable the native rollout switch and update `planned`/prepared map and empty-state copy. Do not compare traffic before a complete treatment is delivered. Preserve the live ID/allocation or create a new experiment for material treatment changes. Attribute and server-event delivery are eventual; cross-device/uninstall identity reconciliation is outside the current contract.
