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
current 15-screen Scroll path, including daily reminders. Widget reviews, notification-denied and recovery
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

## First-seen version comparison

The dashboard automatically discovers versions from each user's first production
`device_attributes` event (`meta.appVersion`). Both the install-cohort query and
journey query select that earliest event before filtering its install date to the
selected window. Later updates do not move users into another version cohort.
Missing or malformed first-version metadata stays Unknown; a later valid version
is not substituted. This is the earliest version in retained source history, not
a newly collected current-version user attribute.

The version table shows the latest five numerically ordered first-seen versions
observed among installs in the selected window, with one row per version. The
horizontal table groups metrics under Global, Ads, and Non-ads. The screen-by-screen journey is restored below this table, with Bible Widget and
Bible Scroll tabs and Full/Shorter Widget routes. It includes all languages and
countries regardless of the market selected for the conversion table. Highest positive conversion rates in each column
are tinted orange, including ties; these are observed rates, not significance claims.
Snapshot schema v7 includes the finished-trial denominator.

### Version-cohort trial and paid conversion

Trial conversion is distinct trial starters / all installs in the version cohort.
Trial → paid is distinct paid users / finished first trials. A trial is finished
only once its recorded expiration has passed; early cancellation does not make
an active trial mature. Missing or invalid expiration dates are excluded. Direct
purchases without a trial are excluded from this rate. A positive verified charge
must belong to the same original transaction chain, follow trial start, and be
a non-trial charge. It only enters the rate once the trial expiration has passed. Rates with no finished trials show a dash.

Outcomes run through report time, including renewals after the selected install
window and after app updates. Transaction chains resolve identity-free renewals;
duplicates count once and refunds do not undo a past paid conversion. Missing
eligible charge amounts suppress the affected paid rate rather than imply zero.
All routes, languages, and countries are included.

Ads currently means `acquisition_source=meta` or
`apple_search_ads_attribution=true` in Superwall user metadata. These keys are read
for the Data tab as well as the full monthly report. At the owner's explicit
request, everyone without either marker is Non-ads, including missing/unknown
attribution; the UI labels this as no recorded ad attribution, not verified organic.
Global counts equal Ads plus Non-ads. Acquisition uses the recorded attribution
metadata available at refresh; first-seen version remains based on the earliest
device event. There is no IP/country/device-language inference of ad origin.

The selected date window may contain fewer than five observed versions. Only
observed versions are shown. Comparing conversion across releases is descriptive:
recent cohorts have had less time to start or finish a trial.

Versy install, transaction, and session facts additionally require the user's
`versy_tracking_environment=production` marker (Poky uses its corresponding key).
Sandbox records remain excluded in SQL. Missing or non-production markers are
excluded, so older versions can lose users whose environment cannot be confirmed.
Identity-free renewals are retained only through a production initial-purchase
chain. Schema v7 invalidates older snapshots that lacked this check.

The shared version table labels installs-to-trial as **Trial start**, with the
cohort denominator visible. Poky additionally shows **Install → paid**: unique
users with a positive non-trial charge / installs in the same first-seen version
and acquisition cohort. It includes direct hard-paywall purchases and paid trial
outcomes, independently of the finished-trial-only **Trial → paid** metric.
Events from other users, pre-install subscription chains, and subsequent app
versions do not move outcomes into a different install cohort. Schema v8 adds
these install-to-paid counts and their money-availability flag.
