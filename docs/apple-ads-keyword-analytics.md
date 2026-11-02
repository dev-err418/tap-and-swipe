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

Realized APPU uses the existing mature-user definition. Realized ROAS uses a
separate, strictly matched older acquisition window: from the selected UTC start
through the earlier of the selected end and the UTC day boundary eight days
before observation. The eight days allow seven-day offers plus observation time.
If that leaves no acquisition days (as in Last week), the UI shows `realized pending`.

Both net proceeds and actual Apple keyword spend use that same older acquisition
window, keyword/campaign and country. Every user in the older cohort must have
completed their observed trial window, including late trial starts. Pending
users keep the matched cohort pending. Realized ROAS is its net proceeds divided
by its actual USD spend, including non-installing taps. It does not estimate
mature users' costs from average acquisition cost. The tooltip shows the matched
UTC dates. APPU beside it can cover a different, more recent mature-user cohort.

Missing older-period proceeds or positive USD spend remains unavailable; mature
non-payers produce 0.0% and refunds can produce negative values. A failure fetching
older spend cannot fall back to full-period spend or suppress otherwise available
total ROAS. Total ROAS and APPU retain their definitions. The click-date versus
first-launch attribution and FX caveats above still apply.

Glow and Versy use the scoped `keyword-cohorts-v3-matched-roas` report cache key.
Each row stores `realizedRoasBasis` with its dates, cohort counts, proceeds and
matched USD spend; the UI calculates only from that basis. Previously saved
average-cost estimates are never displayed as strictly matched ROAS.
