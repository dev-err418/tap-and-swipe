# Current Whop API migration

## November 6 follow-up

Whop's November 5–6 notices identify three keys still making v2 requests:

| Business / key name | Repository callers |
| --- | --- |
| Community / `tap-and-swipe` | Payment webhook enrichment, Discord join lookup, maintenance scripts (`WHOP_API_KEY`) |
| Community / `T&S Mobile App` | Mobile stats, daily stats, MCP tools (`WHOP_COMMUNITY_API_KEY`) |
| ASO / `T&S Mobile App` | Mobile stats, daily stats, MCP tools (`WHOP_ASO_API_KEY`) |

The migration below was still uncommitted on November 6. Git HEAD still had ten
v2 URLs in seven files, although the working tree had already replaced them.
A later deployment from Git can therefore restore the old calls. The October 27
deployment record below is historical, not confirmation of the current server.

`npm run check:whop` runs the migration tests and checks application, MCP, and
maintenance source for retired Whop API URLs and the old GraphQL SDK. It also
checks the retained checkout SDK with a mocked request. `npm run build` now runs
these checks automatically through `prebuild`, including Docker/Coolify builds.
No live checkout, email, Discord action, or database mutation is needed.

November 6 validation: all ten Whop checks, TypeScript (`--noEmit`), changed-file
ESLint, `git diff --check`, and the production build (`npm run build -- --webpack`)
pass. The default Turbopack build was stopped after remaining at compilation
without progress. No retired API URL remains in application or maintenance source.

Ship all migration files together, including `lib/whop-current.ts`, both
`scripts/tests/whop-*.test.ts` files, and the package scripts. Committing only the
modified tracked files would omit the shared client and tests. Deployment and
current server verification were blocked by this session's SSH network sandbox.
After deployment, verify authenticated mobile stats and monitor Whop API logs
for the three named keys; the emails stop once they no longer make v2 requests.

## Migration details

The legacy v2 API stops accepting requests on November 13, 2026. Replacements
in `lib/whop-current.ts` use `/api/v1` with `Api-Version-Date: 2026-10-27`.

Reference: https://docs.whop.com/developer/api/migrate-from-previous-versions

Changed callers: payment webhook, Discord join, mobile/daily MRR, MCP Whop tools,
`import-whop-users.ts`, `backfill-pending-grants.ts`, and
`restore-whop-migration.ts`.

Lists use `first`/`after` and `page_info`; a broken cursor or failed page raises an
error instead of returning a partial report. Variants replace plans, retain
`plan_` IDs, and return numeric prices. Memberships contain `plan_id`, `user_id`,
and `member_id`; email is read from the member. MRR retains the existing 30-day
normalization and two-decimal rounding, and excludes one-time purchases.

Discord joins filter memberships with `external_account=discord_<id>` and do not
need to scan all members. Payment webhooks reuse metadata/stored Discord bindings
before reading `/external_accounts?user_id=...&platform=discord`.

## Production permissions

- Added `social_account:read` to the Community website key. The Community mobile
  key already has it through its Owner role. Whop still returns 403 for a
  customer's `/external_accounts?user_id=...` lookup with company keys; account
  lookups return 200. The permission alone does not enable reverse customer
  Discord lookup. Webhooks retain metadata/stored bindings and email/license
  fulfillment. Discord joins use the working membership filter.
- All three actual production keys successfully read memberships, members with
  email, and variants. Both Community keys find the correct valid membership for
  a real linked Discord account. The ASO AppSprint Website key also received the
  missing `member:email:read` permission in its Whop dashboard.
- Required read permissions are `member:basic:read`, `member:email:read`, and
  `plan:basic:read`. Existing keys and SDK default versions are retained; migrated
  requests explicitly pin `2026-10-27`.
- `WHOP_ASO_COMPANY_ID` and `WHOP_COMMUNITY_COMPANY_ID` can explicitly scope MCP
  variant listing. Otherwise it discovers the account from a membership, falling
  back to `/accounts/me` only for an account without memberships.
- The historical Stripe restoration script now matches Whop by email/Discord;
  current memberships no longer expose Stripe customer/subscription IDs. It still
  independently verifies Stripe status. No maintenance scripts were executed.
  Reverse-Discord imports/backfills cannot rely on company keys to access customer
  external profiles, even after adding `social_account:read`.

October 27 validation (historical): migration tests (`npx tsx --test scripts/tests/whop-current.test.ts`),
TypeScript, changed-file ESLint, production build, and read-only live ASO/Community
MRR checks pass.

## Deployed October 27, 2026, 14:58 UTC

- Container: `zicd5h7al7rnos0xh69yu0jw-20261027T145808`.
- Image: `zicd5h7al7rnos0xh69yu0jw:whop-current-20261027`.
- Image ID: `sha256:c991e5dbcb3249b64615e548f6da309d68be3e184b16fddca4497478aa126a18`.
- Based on the previous production commit
  `04394635f544ae1f25dadd2659e0dd7b2b651766`, with this migration's files applied.
  Unrelated analytics edits were excluded.
- The build used the existing production environment through a temporary BuildKit
  secret. The file was removed after building. Static/content permissions were
  corrected for the existing unprivileged runtime user before switching traffic.
- Runtime environment, routing labels, and analytics-cache volume are preserved.
- Private candidate and live public checks pass: health 200; unsigned webhook 400;
  unauthenticated stats 401; authenticated stats 200 with positive ASO/Community
  MRR. Deployed server code contains the current date pin and no Whop v2 URL.
- The previous container `zicd5h7al7rnos0xh69yu0jw-20261027T121518` and image are
  retained for rollback. Private release records and the original Compose file
  are in `/data/coolify/applications/zicd5h7al7rnos0xh69yu0jw/whop-current-20261027/`
  on `oracle-web`.

No real payment, license email, Discord grant/revocation, or daily notification was
triggered for testing. Source changes remain local and uncommitted; include them
before any future full deployment from Git.
