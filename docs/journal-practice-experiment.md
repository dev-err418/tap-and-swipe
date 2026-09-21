# Glow: Journal VS Practice

App experiment `journal_vs_practice_v1`: sticky 30% Journal / 70% Practice for new assignments, independent of onboarding and paywalls. This replaces the prepared 50/50 split before production enrollment; existing development assignments stay unchanged. Changes the home button's title, icon and destination. Journal retains existing behavior; Practice opens its own modal and suppresses Journal prompts, shortcuts, history and related stats without deleting saved entries. **Production enrollment is enabled in the next app build**, approved September 21, 2026; existing installed releases do not change remotely. Debug overrides are development-only and do not rewrite random assignment.

Source of truth: Glow's `native/Glow/JournalPracticeExperiment.swift` and `native/JOURNAL-PRACTICE-EXPERIMENT.md`. No remote configuration, analytics database, ingestion endpoint, Superwall campaign or SDK placement.

Debug builds allow manual Journal/Practice previews without Premium; this does not grant an entitlement or unlock other features. Release retains the same Premium requirement for both arms. Automatic journal prompts still require a real entitlement. All preview activity remains excluded from production reporting.

## Contract

Custom Superwall scalar JSON string: `gjp1_journal_vs_practice_v1`.

Fields: `schema: 1`, `experiment: journal_vs_practice_v1`, `environment`, `variant: journal | practice`, `assignedAt`, `updatedAt`, `language`, `randomized: true`, `days`. Timestamps use Unix milliseconds. `days` has keys `0`...`30` and values `{ sessions: number, active: true, opens: number }`. No journal text, mood, profile or audio content.

Enroll after onboarding on an active visit with an initialized SDK identity, before home use. Includes new installs and upgrading users, paid and unpaid. Local state scopes to environment and SDK user ID and persists before publish. No cross-device or reinstall guarantee. Debug = development; release sandbox receipt = sandbox. Query `sw.user_attributes_rep FINAL`, `isSandbox=0`, `isDeleted=0`, `ts<now()`, plus production/randomized payload validation.

Dates select **assignment cohorts**, with follow-up through now. Return means foreground activity, not subscription survival:

- D1/D7/D30 use elapsed 24-hour windows `[N×24h, (N+1)×24h)` after enrollment. Entire window must have elapsed to qualify. Non-returners stay in the denominator. Immature rates are null/“—”.
- Sessions: cold launch, or return after >=30 minutes background. Ignore inactive interruptions. Shorter returns mark active but do not start sessions. Continuous foreground use is not a new return until another foreground entry.
- Sessions/user/day: first-seven-day sessions / (7 × users with seven complete days). Include inactive days and users who never return. Day 7 starts the eighth day and is outside this seven-day window.
- Successful home-button accesses are recorded as `opens`; they are not the session metric. Settings and automatic journal openings are not feature opens.

`lib/journal-practice-queries.ts` uses keyset pagination, capped at 200k attributes; page failures/cap return unavailable, not partial totals. `lib/journal-practice-analytics.ts` validates and aggregates server-side; only aggregates reach the browser. Malformed/conflicting users produce warnings. SDK delivery is eventual; offline activity needs later sync and recent results may undercount. No synthetic production records, historical backfills or automatic winner/significance claims.

## Release checklist

The A/B results card uses `AppExperimentLayout` and its shared table, column styles, and Variant A/B badges, exactly like `AppExperimentCard`. It keeps activity-specific retention/session metrics and does not fabricate revenue, country filters, or winner probabilities. Empty, unavailable, and immature values remain distinct.

1. Practice now has 50 paired recordings per language, a player, saved shuffled sessions and offline fallback; finish real-device and fluent localized listening checks.
2. Glow's `productionRolloutEnabled` is enabled; production/sandbox persistence tests and dashboard/map copy match the 30/70 release configuration.
3. Ship the native app and deploy the dashboard separately. Source configuration does not prove App Store rollout.
4. Verify actual production assignment/activity ingestion, allocation counts, mature denominators and environment exclusion.
5. Use a new experiment ID if changing a live treatment or measurement definition.

Tests: `npx tsx --test scripts/tests/journal-practice.test.ts scripts/tests/app-experiment-map.test.ts`. Native: `JournalPracticeTests`, `DailyJournalTests`.
