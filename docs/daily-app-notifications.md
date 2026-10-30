# Daily app notifications

The AppSprint ASO Cloudflare backend sends separate compact daily reports to the
existing **Glow** and **Versy** Telegram groups at **08:00 Europe/Paris**, enabled
on 30 October 2026 at Arthur's request, with the first report on **31 October**. Each shows total USD proceeds, tracked
installs and trial starts for the last 24 hours, with absolute changes against
the preceding 24 hours. Production iOS and Android data are included per app.

The previous Slack morning report remains disabled and Poky is not included.
A/B milestone alerts are separate and unchanged.

The Worker reads Superwall directly with its existing app credentials. Proceeds
include renewals from older subscribers and refunds. Installs are Superwall's
tracked first_seen vendor IDs; trials are unique subscription chains starting a
trial. These are event-time totals, not acquisition-cohort APPU or trial rates.

The authenticated `/api/cron/daily-app-report` endpoint remains available for
compatibility with its original acquisition-cohort definition, but is no longer
used by the scheduled reports. Its original production filtering remains intact.

Configuration, schedule, metric definitions, duplicate protection and recovery:
[AppSprint daily app reports](../../appsprint/appsprint-aso-edge/docs/daily-app-reports.md).
