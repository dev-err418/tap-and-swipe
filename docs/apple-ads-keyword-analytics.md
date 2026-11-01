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

Realized APPU uses the existing mature-user definition. Realized ROAS is
computed separately from full keyword spend and Superwall proceeds in the
older acquisition window ending at least eight days before the current UTC
day, and only if every matched user in that window is mature. No spend is
allocated to individual users. Missing values are never interpreted as zero.
