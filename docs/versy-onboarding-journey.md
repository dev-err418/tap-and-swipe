# Versy onboarding journey

The Data tab offers Bible Widget and Bible Scroll, with Full/Shorter subroutes
under Widget. Pricing results remain under A/B tests; Data links there directly.
The three price assignments are independent, sticky thirds in both families;
Scroll also offers a fixed weekly plan. Only Widget obeys the soft/hard draw.

The updated native app enrolls only at a displayed Welcome/Entry screen. It saves
`versy_onboarding_journey_schema=2`, `versy_onboarding_journey_variant` (the original
three route IDs), `versy_tracking_environment`, and boolean
`versy_journey_<existing screen attribute>` flags via Superwall. Flags and route
persist locally and are republished on startup. Duplicate visits count once.
Debug uses separate local storage and is excluded by the dashboard's production
filter, as are Superwall sandbox users. No questionnaire answers are added.

Existing unprefixed attributes remain for historical reports. Resuming mid-flow
without enrollment does not backfill Welcome or old screens. Schema 2 follows the
current 14-screen Scroll path. Widget reviews, notification-denied and recovery
are branches, so skipped optional screens do not become the next drop-off baseline.
Installs are selected by the existing date window; later screen reach is followed
through now. Completion means final paywall seen, not purchase.

Both families remain visible with an explicit empty state before data arrives.
New counts require deployment of the website and release of the updated iOS app;
there is no historical reconstruction or sample production data.

Read-only verification on October 9, 2026 found 3,767 production Superwall annual
price assignments across the three SKUs (all-time, not the dashboard's 30-day
install cohort), but no `scroll_the_bible` production route assignments yet.
The live signed-in website was not inspected; its login gate remained intact.
