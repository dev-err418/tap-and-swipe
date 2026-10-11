# Glow onboarding journey

The Analytics Data tab shows a screen-by-screen funnel below the version table,
with exactly two tabs: IAM and manifest-audio. Both remain visible before data
arrives. The funnel includes all languages and countries; market selection only
filters the separate conversion table. Snapshot schema v11 invalidates the old
IAM/Copy funnel definitions.

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
Notification-denied and recovery screens are optional branches and do not set the
next step's drop-off baseline. Paywall reach records an actual displayed paywall,
not a presentation request. Both paywall treatments share this final step; their
independent A/B results remain in the A/B tests tab.

The denominator is enrolled installs in the selected install-date window. Later
screen visits are followed through report time. The displayed completion rate is
paywall reach, not purchase; the final onboarding-completed row separately shows
entry into the app (subscribers can bypass the paywall).

New Glow counts require release of this updated native app. Earlier screen visits
cannot be reconstructed and upgrades resuming mid-flow do not invent history.
No questionnaire answers or personal text are included in these new attributes.
