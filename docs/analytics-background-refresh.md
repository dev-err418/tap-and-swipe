# Background app analytics

App reports can be served from private, persistent snapshots while a Cloudflare
Worker refreshes them every 30 minutes. These are disposable calculated reports,
not an event warehouse. Superwall and PostHog remain the sources of truth.

## Coverage

- Glow, Poky and Versy: overview, install cohorts, countries and onboarding for
  Today, Yesterday, Last 3 days, Last week, Last month and All time.
- Monthly A/B tests, native paywalls and Glow onboarding experience.
- Glow and Versy product activity for all six periods, monthly win-back reports,
  and Versy's legacy placement report.
- Directory cards share the same snapshots as their app's Data tab.

Website funnels, editable notes and individual user-journey lookups stay live.
All existing dashboard permissions still apply. Snapshot files must never be
served publicly, uploaded to the public video bucket, or included in builds.

## Enable on Coolify

1. Add a persistent volume mounted at `/app/analytics-cache`. It must be writable
   by UID/GID 1001. The Docker image creates that directory with those permissions;
   a host bind mount needs matching ownership on the host too.
2. Set `ANALYTICS_SNAPSHOT_DIR=/app/analytics-cache` in the application's runtime
   environment. Keep the existing `CRON_SECRET` configured. No database migration.
3. Deploy the application with the new `/api/cron/analytics-refresh` POST endpoint.
4. Configure and deploy the Worker below, then verify its first runs in Workers Logs.

Production only enables persistence when `ANALYTICS_SNAPSHOT_DIR` is explicitly
set. Without it, reports keep a short memory cache and the refresh endpoint returns
503, rather than claiming that container-local files are durable. Development uses
`.cache/analytics` (ignored by Git and Docker) unless a directory is supplied.
Development refreshes stale snapshots on demand after 30 minutes, since it has no
external scheduler. Production always serves the saved snapshot.

This implementation targets the existing single Next.js application process. Use
one scheduler. Multiple replicas must share the mounted directory, and a distributed
refresh lock should be added before scaling out; in-process requests are deduplicated.

## Cloudflare scheduler

From the repository root, using an authenticated Cloudflare account:

```sh
npx wrangler secret put CRON_SECRET --config cloudflare/analytics-refresh/wrangler.jsonc
npx wrangler deploy --config cloudflare/analytics-refresh/wrangler.jsonc
```

Enter the existing application's secret at the prompt; never commit it. Verify
`ANALYTICS_ORIGIN` in the configuration before deployment. It must be the canonical
HTTPS origin with no redirects. The Worker has no public fetch endpoint.

Glow starts at :00/:30, Poky at :10/:40, and Versy at :20/:50 (UTC). Each app is
refreshed every 30 minutes, with sequential report jobs to limit provider load.
There are 36 report jobs across all three apps in a full cycle. Each request
refreshes exactly one allowlisted report and returns only job metadata.

The Worker continues other jobs if one fails and marks the scheduled invocation
failed afterward. Enable failure alerts in Cloudflare and inspect Workers Logs.
It caps each request at 110 seconds and the batch at 13 minutes. If upstream queries
repeatedly exceed that budget, use a server-side job runner/queue rather than
increasing concurrency or relying on a long request through the proxy. The current
code does not detach work after sending a response or claim success for queued work.

To warm a specific snapshot or retry a failed job from a trusted terminal:

```sh
curl --fail-with-body https://tap-and-swipe.com/api/cron/analytics-refresh \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H 'Content-Type: application/json' \
  --data '{"appId":"glow","kind":"experiments","period":"month"}'
```

See `lib/analytics-refresh-jobs.ts` for the full finite job list. Scheduled jobs also
warm empty caches, so a first visitor is not necessary. Before warmup completes,
a missing snapshot loads live once and saves a complete result.

## Freshness and failure behavior

- Readers use saved results even while a refresh is running or overdue. Timestamp
  labels show each report's last successful update; after an hour they flag delay.
  The Data tab, A/B tests, product activity and paywalls may have different timestamps.
- A new successful report is written to a private temporary file and atomically
  renamed. Readers never see a partially written file. Chart Dates round-trip as Dates.
- Upstream errors and reports with unavailable, limited or truncated sections do
  not replace a complete snapshot. The cron returns 502 so failure is observable.
  With no prior snapshot, the existing incomplete/unavailable UI remains available.
- Snapshot read errors fall back to live loading; a write failure does not turn usable
  live results into a page error, but it fails a scheduled refresh.
- Snapshot files include only report output, never provider credentials. Product
  reports still contain private analytics and must be treated as private data.
- Bump `VERSION` in `lib/analytics-snapshot.ts` when report shapes or metric definitions
  change. Old versions can be deleted after rollout; a new version needs warmup.
- Calendar-day labels use the last saved window until the next successful refresh,
  including just after Paris midnight. Check the update timestamp when comparing days.

## Verification

```sh
npx tsx --test scripts/tests/analytics-snapshot.test.ts scripts/tests/analytics-refresh.test.ts scripts/tests/analytics-routes.test.ts scripts/tests/analytics-page.test.ts
npx tsc --noEmit
npm run build
```

The tests use temporary files and mocked report providers, with no production data
or database access. Deployment and successful live warmup are separate checks.

Cloudflare references: [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
and [Worker limits](https://developers.cloudflare.com/workers/platform/limits/).

## Production rollout

Enabled on October 11, 2026 for `https://tap-and-swipe.com`:
- Coolify mounts its named `analytics-cache` volume at `/app/analytics-cache`.
- Product report read credentials are configured as runtime-only environment values.
- Worker `tap-and-swipe-analytics-refresh` uses the application's existing cron secret.
- Cloudflare's scheduled Versy invocation and a remote Poky scheduled-handler test
  both completed successfully. The cron endpoint rejects unauthenticated requests.

Workers uses `redirect: "manual"`; redirects fail the HTTP success check without
forwarding the secret. An unavailable statistical sample-size estimate is valid
report output and does not block caching. Actual missing/failed/truncated source
reports still fail refresh. Glow's trial comparison retains explicit query caps
(5,000 starts and 100,000 activity rows), with an extra row to detect truncation;
its original 300-start cap was below the production monthly cohort size.
