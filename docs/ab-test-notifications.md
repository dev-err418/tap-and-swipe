# A/B test notifications

The existing AppSprint ASO backend now contains an optional hourly milestone checker. The first configured rule is: **notify #ab-tests once the current AppSprint pricing variant B (€108/year) reaches 1,000 unique visitors**.

It sends both variants’ visitor counts, paid conversion, revenue in their own currencies, and a dashboard link. Each rule sends once. The message notes that the USD control includes prior-test history and does not declare a statistically reliable winner.

The implementation is prepared but requires the new Slack channel ID, bot membership, delivery-ledger setup, Worker configuration, and deployment before it is active.

The setup and scheduling guide is in the sibling AppSprint backend repository:

[How to schedule alerts, add milestones, pause them, and recover a failed delivery](../../appsprint/appsprint-aso-edge/docs/ab-test-alerts.md).

Example future request:

> Notify me in #ab-tests when the current pricing variant B reaches 2,000 visitors, with A and B’s paid conversion and revenue. Send it once.

Use a new rule ID for each milestone. Changing the destination or redeploying does not reset already-sent alerts. Mobile-app and CTA alert adapters are not implemented yet.
