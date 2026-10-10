# Versy product analytics in Tap & Swipe

## Paywall placements

The Paywalls tab at `/analytics?app=versy` now uses the same verified native purchase report as Poky. It shows onboarding routes and original purchase placements with conversions (including trials), paid users, net USD proceeds, APPU including non-payers, refunds and refund rate. New Welcome enrollments use `versy_onboarding_outcomes_v1`; users first observed later use `versy_returning_paywalls_v1`. Actual purchases, later renewals and refunds join through immutable `gp1_t_<Apple transaction ID>` records to Apple's integration events by original transaction ID. Debug/sandbox records are excluded. All-country native outcomes are descriptive because they include forced Mexico and saved assignments; randomized onboarding and yearly price comparisons remain in **A/B tests**. The table includes all languages and Portuguese.

A collapsed **App event history** section retains the PostHog reach/view/attempt/client-result counts for old and current builds. It does not invent historical revenue attribution. Missing backend data is reported as unavailable, not zero. Empty native results before the iOS release explain why and point to the existing A/B reports. New attribution requires release of the iOS app and deployment of the dashboard. Read-only verification on October 9 confirmed Versy's Apple integration includes purchases, renewals and refunds, and that the native loader succeeds; no production gp1 cohorts have arrived yet. A sandbox/TestFlight purchase is still required to verify the new path end to end.

The Versy app overview at `/analytics?app=versy` loads its **Data** tab's product panel from `GET /api/analytics/versy-product?period=week`. The page remains responsive while the report loads. The route is read-only and returns fixed, bounded aggregates and the 25 latest anonymized trial cancellation journeys. It does not accept SQL or a user ID from callers.

## Server setup

Set these in the Tap & Swipe server environment (Coolify for production):

| Name | Value |
| --- | --- |
| `POSTHOG_VERSY_PROJECT_ID` | `92537` |
| `POSTHOG_VERSY_REGION` | `eu` |
| `POSTHOG_VERSY_READ_KEY` | The existing PostHog **personal API key** (`phx_…`) used for Glow, with `query:read` for project 92537. Keep it server-side. A `phs_` project secret cannot read the Query API. |
| `VERSY_ANALYTICS_AGENT_TOKEN` | Optional, independent random bearer token for a trusted agent. Do not reuse the PostHog API key. |

The route also accepts the signed-in owner's Discord admin session. A bearer token is needed only for an external agent such as a private Grok tool. The server returns `401` without either credential outside development. Give the agent only this route and token, never the PostHog key. Examples after deployment:

```http
GET https://YOUR_TAP_AND_SWIPE_HOST/api/analytics/versy-product?period=week
Authorization: Bearer YOUR_VERSY_ANALYTICS_AGENT_TOKEN
```

For one exact Superwall user ID, send a JSON `POST` request to the same route. The ID stays out of URLs and proxy logs. The response contains at most 250 recent allowlisted events with safe metadata (including widget prompt source, permission and purchase results, paywall placement, and reading-session counts), full-period usage totals, latest observed access state and its timestamp, and a `truncated` flag. It does not include verse text, prayer text, names, or the raw Superwall ID. `truncated=true` limits the visible timeline; the usage totals remain complete for the selected period.

```http
POST https://YOUR_TAP_AND_SWIPE_HOST/api/analytics/versy-product
Authorization: Bearer YOUR_VERSY_ANALYTICS_AGENT_TOKEN
Content-Type: application/json

{"period":"month","userId":"SUPERWALL_USER_ID"}
```

Allowed periods: `day`, `yesterday`, `3days`, `week`, `month`, `all`. The aggregate response includes `status`, `windowStart`, `windowEnd`, `notifications`, `widgets`, `features`, `reading`, `favorites`, `screens`, `categories`, `premiumUse`, `trialComparison`, `feedback`, `cancellations` (trials), and `paidCancellations`. `status=empty` means no production events from the instrumented native app yet; `setup_required` and `unavailable` are distinct from zero use. Server query results are cached for 90 seconds, while HTTP responses are private and not cached.

## Definitions

- **Notification allow rate:** unique users with `notification_permission_resolved` result authorized, provisional, or ephemeral, divided by unique users with an allowed or denied first iOS prompt result. It is not Versy's own reminder-toggle rate.
- **Notification permission seen and Versy reminders enabled:** each user's latest `app_state_snapshot` in the period determines the observed iOS permission and app reminder setting. The app setting and OS permission can disagree. These describe users who opened Versy during the period, not every installed user.
- **Seen with widget:** unique users with `has_widget=true` in an `app_state_snapshot`, divided by users with any non-null widget check in the period. This is prevalence among checked users, not an install conversion rate.
- **Detected widget adds:** transitions from known absent to installed. The source is the most recent widget prompt within 24 hours, or unattributed. Prompt views by source are shown alongside adds, but they do not form a controlled conversion rate. iOS cannot establish which invitation caused an install.
- **Feature use:** unique users, event count, and events per active user for verse views, swipes, likes, prayer starts/messages, categories, widget prompts and opens, and notification opens. A verse view is a visible page, not proof that it was read.
- **Verse reading sessions:** a session ends when Versy leaves the home or category feed or moves to background. The averages use completed visits with at least one visible verse page and a `quote_reading_session` event. Brief visits and app terminations before an end event can be missed. Views are visible pages, not proof of reading.
- **Saved verses:** each observed user's latest `favorite_count` snapshot in the period yields the average collection size and share with at least one saved verse. This includes favorites saved before the instrumented release, unlike the `quote_liked` action count.
- **Screens:** total measured screen duration divided by unique users with a `screen_time` event for that screen. This is average tracked time per active user, not average visit duration.
- **Categories:** distinct users whose state snapshot included a category during the period. Users may appear in multiple categories.
- **Trial, paid, free, and unknown use:** the native app registers `access_phase` at the time of each action. A verified current StoreKit transaction with a free-trial offer is `trial`; a verified current transaction without a free-trial offer is `paid`; no entitlement is `free`. Superwall access without a verified transaction, older iOS versions without the necessary transaction offer property, and events before phase tracking are `unknown`. The app still records `is_premium` as access granted. Users can appear in multiple phases over time. The per-user latest observed phase and access are snapshots, not live subscription checks.
- **Early trial comparison:** production `sw_trial_start` events are mature only 96 hours after the start, allowing time for 72-hour outcomes to arrive. For each person, compare feature adoption during the first 12 hours of their latest sampled trial with a cancellation event during hours 12–72. People who cancelled in the first 12 hours are counted separately and excluded. Only trial starters sharing the same UTC start week and known product are compared if that stratum contains both outcomes. “Continued” means no cancellation was observed by hour 72, not eventual retention or conversion. This is observational and can be affected by missing native events, analytics opt-outs, and unmatched identities. The report caps trial starts at 300 and activity at 15,000 rows; if either cap is reached it returns `trialComparison.status=truncated` rather than a partial comparison. Sparse cohorts return `waiting`.
- **Subscription feedback:** an optional Settings sheet records one structured reason (`price`, `not_enough_use`, `content_fit`, `notifications`, `widget`, `technical_issue`, or `other`) only when usage analytics are enabled. `feedback` counts users by reason. It is voluntary and not a representative cancellation survey. The nearest response from seven days before through 14 days after a cancellation is linked to that user's cancellation journey when available.
- **Before cancellation:** separate lists for up to 25 recent `sw_trial_cancelled` events and 25 paid cancellations (`sw_subscription_cancelled` or `sw_intro_offer_cancelled`), each with the matching users' preceding seven days of selected production app events. The join uses the Superwall user ID used as the PostHog distinct ID. The route returns only a shortened hash to callers. The report includes the latest actions, feature counts, last observed app version, and optional user supplied reason; actions before cancellation are correlation, not proof of a cause. `cancelReason` is Superwall's subscription reason when present. A cancelled trial or paid subscription can later be reactivated, so each list describes the cancellation event rather than a permanent churn state.

The report starts at the first instrumented native release on or after 2026-09-25. Older app events in this project are excluded by event names and production property. A cancellation with no matching native events may be from an older build, an analytics opt-out, or a transaction without a usable matching ID. Superwall falls back to the original transaction ID when its original app user ID is missing; those events cannot join to a native Superwall UUID. The native app can disable product analytics in Settings; the report never backfills opted-out activity.

## Native app configuration

Set `PostHogProjectKey` (`phc_…`) and `PostHogHost` (`https://eu.i.posthog.com` or `https://us.i.posthog.com`) in `native/Versy/Info.plist`. The app deliberately sends nothing until both are set. The public project key belongs in the app; the personal query key stays on the Tap & Swipe server. Connect Superwall subscription events to the same PostHog project with the Superwall user ID as distinct ID so the pre-cancellation journeys can join. No app content or prayer text is sent. PostHog automatic screen capture, replay, surveys, crash auto-capture, lifecycle capture, and interaction capture are disabled; only the named product events are sent.

The active onboarding experiment is `bible_widget_shorter_v1`: new assignments split 50/50 between `bible_widget` and `bible_widget_shorter`. Existing widget assignments stay in the full flow; retired Prayer journey assignments are reassigned. The shorter flow omits only Habit and Relationship with God, retaining the shared `bible_widget_<step>_screen_seen` attributes. Journey and A/B reports require the new experiment ID. Historical Prayer journey paywall traffic remains under its original raw placement, outside the two active onboarding rows.

Paywalls now show yearly-only plans with a saved 50/50 soft/hard split (`versy_yearly_paywalls_v1`). The plan-layout test is retired. Existing access and yearly-price assignments carry forward, including users previously shown Yearly + Weekly. The three-price test remains; the combined report uses `versy_yearly_paywall_configuration_v1` and shows six access × price cohorts.

Onboarding recovery is a conditional branch after the primary paywall (`bible_widget_recovery_screen_seen`), shared by both widget funnels. `onboarding_recovery_reached` and existing win-back events distinguish `onboarding_purchase_cancelled` from `onboarding_paywall_dismissed` using `source`. Primary paywall reach remains the journey completion metric; recovery does not inflate primary paywall conversions. The current promotional offer still needs a new-subscriber-eligible product before shipping onboarding recovery.


## Bible Scroll onboarding experiment

The AB tests tab compares `scroll_the_bible_v1`: 10% `bible_widget`, 10% `bible_widget_shorter`, and 80% `scroll_the_bible` for new assignments; existing assignments stay stable. The previous `bible_widget_shorter_v1` comparison remains in its own historical card. The current user journey reads all 15 `scroll_bible_<step>_screen_seen` attributes through `scroll_bible_trial_screen_seen`. Its funnel includes all countries and is descriptive. New comparison cards label the final-screen rate **Paywall reached**, rather than treating widget installation as onboarding completion.

Mexico receives Bible Scroll automatically. If either the install country or the app's reported `country` identifies Mexico, that person is shown in the Mexico descriptive card and excluded from winner calculations. Missing, unknown, or conflicting country values go into a separate descriptive card. Only matching known non-Mexico countries enter the comparison. These are geographic proxies: the app does not yet persist immutable assignment geography, so later geo changes cannot be reconstructed.

Bible Scroll's onboarding paywall is `onboarding_scroll_bible`; the premium study gate is `verse_study_upgrade`. Its trial screen is dismissible and offers the assigned yearly product plus the fixed weekly product. It does not follow the widget soft/hard access assignment or recovery branch. Access and configuration comparison cards therefore include widget variants only; the yearly-price comparison still includes all assigned variants. The placement report never synthesizes a view or conversion from a reach event. The updated Scroll Bible screen records both reach and view once per presentation. Earlier builds omitted the view event, so their view/conversion counts can remain zero; historical views are not inferred.


New assignments now use 15/15/70; existing saved assignments are not redrawn and Mexico remains forced to Bible Scroll. The map shows configured allocation, not the observed mix. The experiment ID remains unchanged because the variants themselves have not changed.

Onboarding cards also show **Avg sessions / day**: unique production Superwall `session_start` events divided by observed user-days since install, capped to the reporting window and current time. This includes free and zero-session users, excludes pre-install events, and uses the same country/variant cohorts as the rest of each card. It is an all-user engagement metric, not sessions per paid subscription day. Failed or truncated session queries and cohorts with no observed time display a dash.

## Daily gift paywall

See [the daily gift contract](versy-daily-gift.md) for its separate `versy_daily_gift_v1` cohort and `daily_gift_app_open` placement, sealed-to-revealed funnel, and Apple purchase attribution. It is a nonrandomized rollout, not another onboarding A/B test.
