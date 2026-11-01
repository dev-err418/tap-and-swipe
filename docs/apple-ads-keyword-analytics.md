# Apple Ads keyword analytics

The app analytics keyword table joins Superwall first-launch cohorts and net
subscription proceeds to read-only Apple Ads keyword reports. In production,
configure these server-side Coolify environment variables:

- `APPLE_ADS_CLIENT_ID`
- `APPLE_ADS_TEAM_ID`
- `APPLE_ADS_KEY_ID`
- `APPLE_ADS_ORG_ID`
- `APPLE_ADS_PRIVATE_KEY` (PEM; literal `\n` line separators are supported)

Do not expose these variables to the browser. Development also supports the
existing local Apple Ads connection file. Without a working Apple connection,
keyword spend and ROAS remain unavailable; Superwall metrics still load.

Apple keyword costs include deleted entries, non-installing taps and all
matching ad groups. Reports use UTC calendar dates, so a selected dashboard
window is expanded to UTC day boundaries for this table. The current day is
partial. Superwall first launches and Apple click-date spend are not an exact
one-to-one match, and attribution may be delayed. ROAS is provisional.
Apple spend remains in its original currency; ROAS uses the latest ECB USD
reference rate for EUR, not transaction-day FX. Unsupported currencies or a
failed FX read leave ROAS unavailable.

Realized APPU uses the existing mature-user definition. Estimated realized ROAS
uses that same mature-user APPU divided by average acquisition cost
(`keyword USD spend / all attributed users`) for the selected period and country.
It assumes mature users have the same average acquisition cost as the full
keyword cohort; Apple does not supply individual-user spend. The full keyword
cost includes taps that never installed. This is an estimate, displayed with
`≈` and explained in its tooltip, rather than a separate older-period ROAS.

The previous fixed eight-day cutoff made realized ROAS empty in Last week even
when three-day trials had matured. There is now one acquisition window for the
keyword row, its realized APPU and spend. Recent pending users no longer blank
the entire row. With no mature users the UI shows `realized pending`; incomplete
money or missing/zero spend remains unavailable, while mature non-payers show
0.0%. Negative net proceeds remain negative. Total ROAS keeps its definition.
Snapshot v35 refreshes the changed calculation; the UI also derives the value
from the row's existing aggregates, so an older stored ratio is not reused.
