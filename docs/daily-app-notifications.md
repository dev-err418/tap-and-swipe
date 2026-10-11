# Daily app notifications

The AppSprint ASO Cloudflare backend sends the morning report to Slack **#ab-tests** at **08:00 Paris time**, covering all production users of Glow (☀️), Versy (🙏), and Poky (💉).

The authenticated `/api/cron/daily-app-report` endpoint provides two exact 24-hour acquisition cohorts: tracked installs, APPU (net USD proceeds / all cohort installs), and trial-start rate (trial starters / cohort installs). Outcomes stop at each window's close so the prior cohort does not get an extra day to convert. Sandbox/development data is filtered by the same source loader as the dashboard. No language filter applies.

Configuration, schedule, change formatting, duplicate protection and recovery are documented in `appsprint-aso-edge/docs/daily-app-reports.md` in the adjacent AppSprint repository.
