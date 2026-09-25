# Glow product analytics in Tap & Swipe

The Glow app overview at `/analytics?app=glow` loads its **Data** tab's product panel from `GET /api/analytics/glow-product?period=week`. The page remains responsive while the report loads. The route is read-only and returns fixed, bounded aggregates and the 25 latest anonymized trial cancellation journeys. It does not accept SQL or a user ID from callers.

## Server setup

Set these in the Tap & Swipe server environment (Coolify for production):

| Name | Value |
| --- | --- |
| `POSTHOG_GLOW_PROJECT_ID` | `108470` (EU project) |
| `POSTHOG_GLOW_READ_KEY` | A PostHog **personal API key** (`phx_…`) with `query:read` for this project. Keep it server-side. A `phs_` project secret cannot read the Query API. |
| `GLOW_ANALYTICS_AGENT_TOKEN` | Optional, independent random bearer token for a trusted agent. Do not reuse the PostHog API key. |

The route also accepts the signed-in owner's Discord admin session. A bearer token is needed only for an external agent such as a private Grok tool. The server returns `401` without either credential outside development. Give the agent only this route and token, never the PostHog key. Examples after deployment:

```http
GET https://YOUR_TAP_AND_SWIPE_HOST/api/analytics/glow-product?period=week
Authorization: Bearer YOUR_GLOW_ANALYTICS_AGENT_TOKEN
```

For one exact Superwall user ID, send a JSON `POST` request to the same route. The ID stays out of URLs and proxy logs. The response contains at most 250 recent allowlisted events with safe metadata, full-period usage totals, latest observed access state and its timestamp, and a `truncated` flag. It does not include quote text, journal content, names, or the raw Superwall ID. `truncated=true` limits the visible timeline; the usage totals remain complete for the selected period.

```http
POST https://YOUR_TAP_AND_SWIPE_HOST/api/analytics/glow-product
Authorization: Bearer YOUR_GLOW_ANALYTICS_AGENT_TOKEN
Content-Type: application/json

{"period":"month","userId":"SUPERWALL_USER_ID"}
```

Allowed periods: `day`, `yesterday`, `3days`, `week`, `month`, `all`. The aggregate response includes `status`, `windowStart`, `windowEnd`, `notifications`, `widgets`, `features`, `reading`, `favorites`, `screens`, `categories`, `premiumUse`, `cancellations` (trials), and `paidCancellations`. `status=empty` means no production events from the instrumented native app yet; `setup_required` and `unavailable` are distinct from zero use. Server query results are cached for 90 seconds, while HTTP responses are private and not cached.

## Definitions

- **Notification allow rate:** unique users with `notification_permission_resolved` result authorized, provisional, or ephemeral, divided by unique users with an allowed or denied first iOS prompt result. It is not Glow's own reminder-toggle rate.
- **Notification permission seen and Glow reminders enabled:** each user's latest `app_state_snapshot` in the period determines the observed iOS permission and app reminder setting. The app setting and OS permission can disagree. These describe users who opened Glow during the period, not every installed user.
- **Seen with widget:** unique users with `has_widget=true` in an `app_state_snapshot`, divided by users with any non-null widget check in the period. This is prevalence among checked users, not an install conversion rate.
- **Detected widget adds:** transitions from known absent to installed. The source is the most recent widget prompt within 24 hours, or unattributed. Prompt views by source are shown alongside adds, but they do not form a controlled conversion rate. iOS cannot establish which invitation caused an install.
- **Feature use:** unique users, event count, and events per active user for quote views, swipes, likes, practice, categories, widget prompts and opens, and notification opens. A quote view is a visible page, not proof that it was read.
- **Quote reading sessions:** a session ends when Glow leaves the home or category feed or moves to background. The averages use all completed feed visits with a `quote_reading_session` event. Brief visits and app terminations before an end event can be missed. Views are visible pages, not proof of reading.
- **Saved quotes:** each observed user's latest `favorite_count` snapshot in the period yields the average collection size and share with at least one saved quote. This includes favorites saved before the instrumented release, unlike the `quote_liked` action count.
- **Screens:** total measured screen duration divided by unique users with a `screen_time` event for that screen. This is average tracked time per active user, not average visit duration.
- **Categories:** distinct users whose state snapshot included a category during the period. Users may appear in multiple categories.
- **With access versus without access:** event-time `is_premium` from the native app. An active trial can have access; this flag does not distinguish trial from paid. Users can appear in both groups if their status changed. The per-user `latestObservedAccess` is only the most recent app snapshot, not a live entitlement check. Superwall remains the authority for purchases and subscription status.
- **Before cancellation:** separate lists for up to 25 recent `sw_trial_cancelled` and 25 `sw_subscription_cancelled` events, each with the matching users' preceding seven days of selected production app events. The join uses the Superwall user ID used as the PostHog distinct ID. The route returns only a shortened hash to callers. The report includes the latest actions and feature counts; actions before cancellation are correlation, not proof of a cause. `cancelReason` is Superwall's subscription reason when present, not direct user feedback. A cancelled trial or paid subscription can later be reactivated, so each list describes the cancellation event rather than a permanent churn state.

The report starts at the first instrumented native release on or after 2026-09-25. Older app events in this project are excluded by event names and production property. A cancellation with no matching native events may be from an older build, an analytics opt-out, or a transaction without a usable matching ID. The native app can disable product analytics in Settings; the report never backfills opted-out activity.
