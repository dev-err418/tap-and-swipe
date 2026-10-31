# Glow and Versy subscription notifications

The Telegram subscription webhook lives in the sibling
[`appsprint-aso-edge` backend](../../appsprint/appsprint-aso-edge/src/superwall-slack-webhook.ts),
not this site's legacy RevenueCat-to-Discord route.

The notification change links trial conversions to their original trial
message and appends onboarding details to trial starts. Versy labels are Widget,
Scroll Remix, Scroll Animated and Scroll Video, plus (note) / (no note) when the
stored note assignment is known. Glow includes its saved onboarding and paywall
flow labels. Missing attributes are not guessed.

See the backend's
[notification contract and rollout instructions](../../appsprint/appsprint-aso-edge/docs/superwall-telegram-alerts.md#trial-replies-and-onboarding-labels).
The production database migration and Worker deployment completed on 2026-10-31
(Worker version `5f46356c-1ddb-4957-a92e-659f608197f3`, 100% traffic). Original
messages sent before message-ID capture continue to receive standalone
conversion notifications.
