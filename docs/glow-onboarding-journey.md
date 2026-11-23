# Glow onboarding journey

The Analytics Data view shows the screen-by-screen funnel below the version
table. The funnel includes first installs on Glow 1.8.8 or later. New installs
use IAM, and the manifest-audio route remains available for recorded journeys.
The country picker filters both screen reach and conversions.

The native app enrolls on a real Welcome screen and persists schema 1, route,
and visited screens. Superwall receives `glow_onboarding_journey_schema=1`,
`glow_onboarding_journey_variant` (iam or manifest-audio),
`glow_tracking_environment`, and `glow_journey_<screen>_screen_seen` flags.
`glow_journey_completed` is set on real onboarding completion. Saved flags are
republished on startup. Revisits count once; completion freezes the journey.
Previews cannot enroll; development builds use separate storage and are excluded
by the production-only query, alongside Superwall sandbox users.

Step order matches each current native sequence, including text transitions,
audio preview, customization, notifications and both trial setup screens.
Trial introduction and trial reminder lead directly to the standard paywall.
Notification denial and recovery are optional branches that preserve the
previous main-path step as the drop-off baseline. Paywall reach records an
actual displayed paywall.

The denominator is enrolled installs in the selected install-date window. Later
screen visits are followed through report time. The displayed completion rate is
paywall reach, not purchase; the final onboarding-completed row separately shows
entry into the app (subscribers can bypass the paywall).

New Glow counts require release of this updated native app. Earlier screen visits
cannot be reconstructed and upgrades resuming mid-flow do not invent history.
No questionnaire answers or personal text are included in these new attributes.

## Retired paywall note experiment (v2)

Earlier builds recorded `paywall_testimonials` and `team_note` before
`trial_access` in the note arms. Glow 1.8.8 retired the experiment. The
historical assignments and event definitions are documented in
[the analytics contract](native-paywall-analytics.md#retired-glow-onboarding-paywall-flow-test).
