# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint (flat config, next/core-web-vitals + next/typescript)
npx prisma generate  # Generate Prisma client (also runs on npm install via postinstall)
npx prisma db seed   # Seed lessons
npx prisma migrate dev  # Create and apply migrations
npx tsx scripts/<name>.ts  # Run admin scripts (grant-role, import-whop-users, register-discord-commands, test-email, migrate-to-clean-db)
npm run check:discover     # Validate episodes/case studies/drafts against Google Discover requirements
```

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript, TailwindCSS 4, shadcn/ui (New York style, configured in `components.json`), PostgreSQL with Prisma ORM (@prisma/adapter-pg), Auth.js v5 (Google + email magic link) + legacy Discord OAuth, Cloudflare R2 for video hosting, Resend for email.

## Hosting

Self-hosted on **Coolify** (running on an Oracle VPS). Not Vercel. Do not assume Vercel-specific features (Edge runtime defaults, `@vercel/*` packages, Vercel Cron, Vercel KV, Vercel Blob, etc.). The app ships as a standalone Docker build and is deployed via Coolify. Cron jobs are triggered via HTTP calls to `/api/cron/*` endpoints (protected by `CRON_SECRET`), not Vercel Cron.

## Local Development

The PostgreSQL database runs in a Docker container on the same Oracle VPS (also managed by Coolify) and is **not exposed to the public internet**. To run anything locally that touches the DB (dev server, Prisma seed/migrate/generate, admin scripts), an SSH tunnel must be open:

```bash
ssh -f -N -L 15432:10.0.2.14:5432 oracle-web
```

`.env.local` then points `DATABASE_URL` at `localhost:15432`. Full setup, TablePlus connection details, and teardown are in `TUNNEL.md`. If a Prisma command hangs or fails to connect locally, the tunnel is the first thing to check. The container's Docker IP can drift when Coolify rebuilds — TUNNEL.md has the lookup command for the current IP.

## Architecture

### Multi-Product Site

This codebase is the landing + course platform for several products:

- **App Sprint Community** (`/app-sprint-community`) — the main product: a paid community + course roadmap teaching users to build and monetize iOS apps. Checkout via Whop (`/api/checkout`).
- **ASO product** (`/aso`) — App Store Optimization Mac app with its own Stripe checkout (`/api/aso/checkout`), license key system, and separate database (`ASO_DATABASE_URL`).
- **Bundles** — combined Community + ASO packages (`/api/checkout/bundle`, `/api/aso/checkout-bundle`).
- **Quiz funnel** (`/app-sprint` landing) — lead generation quiz that captures QuizLead records and routes leads to booking/WhatsApp.
- **App landing pages** — Divvy, NetPay, Versy, Lua, Glow each have privacy/terms/support pages. Content lives in `/content/{app-name}/` as Markdown files.

### Course Platform

The course lives at `/learn` (gated, requires auth). Key pieces:

- **Categories** defined in `lib/roadmap.ts` — ordered list: getting-started, find-your-idea, design, build, build-with-boilerplate, monetize, launch-and-grow, scaling, weekly-calls.
- **Lessons** seeded via `prisma/seed.ts` with stable IDs `seed-{category}-{order}`. Each lesson is video or markdown type. Videos can be hosted on R2 (`videoUrl`) or YouTube (`youtubeUrl`).
- **Progress** tracked per-user in LessonProgress table.
- **Access control**: `User.subscriptionStatus = "active"` is the only field gated on in the learn flow (`app/api/learn/progress/route.ts`). The `User.tier` column exists (`"full" | "starter"`) but is not currently enforced anywhere in code, so granting access means setting `subscriptionStatus = "active"`. There is no `PremiumUser` table and no `lib/premium.ts`. Use `scripts/check-and-fix-access.ts <discordId>` to upsert a user as active.
- **Invite links**: token-based system (InviteLink model) to grant access. Redemption creates a private Discord support channel with welcome messages.

**CRITICAL**: When adding lessons to `prisma/seed.ts`, ALWAYS append to the end of a category. Never insert in the middle or reorder — progress is tracked by `seed-{category}-{order}` IDs.

### Authentication

Two auth systems coexist during the transition:

1. **Auth.js v5** (`lib/auth.ts`) — primary auth for new users. Providers: Google OAuth + email magic link (via SES/nodemailer). Database sessions via `Account`/`Session`/`VerificationToken` tables. Route handler at `/api/auth/[...nextauth]`. Login page at `/login`.

2. **Legacy Discord OAuth** (`lib/session.ts`) — still functional for existing users. Sessions are JWT cookies (`discord_session`) via jose.

The `/learn` layout checks Auth.js session first, then falls back to the legacy Discord session. Both paths resolve to a `User` record.

GitHub OAuth remains a separate linkable account for boilerplate repo access (`/api/auth/github/`).

Auth is enforced in the learn layout (`app/learn/layout.tsx`). Unauthenticated users are redirected to `/login`. **Auth is skipped entirely in development mode.**

### Payments

Multiple payment providers, each with webhook handlers in `/api/webhooks/`:

- **Stripe** — Community subscription (`/api/checkout`), ASO subscription (`/api/aso/checkout`), bundles. Community subscribers also get an ASO Pro license emailed automatically.
- **Whop** — marketplace integration.
- **RevenueCat** — mobile in-app subscription events for the Glow and Bible apps. Stores RevenueCatEvent records (used for daily stats) and posts notifications to Discord. Does NOT update User records.

Checkout metadata includes both `userId` and `discordId` (when available). Webhooks update User records (subscriptionStatus, paymentProvider, roleGranted).

### Discord Integration

Discord is an optional linkable account for community access. Discord bot handles slash commands (`/stats`, `/invite`) via `/api/discord/interactions`. Webhook notifications via `lib/discord-webhook.ts`. When users subscribe, they can get a Discord role. Invite redemption auto-creates a private support channel with welcome messages.

### Video Hosting

Course videos support two sources (R2 preferred, YouTube fallback):
- **Cloudflare R2** — self-hosted via `videoUrl` field. HTML5 `<video>` player in `LessonCard.tsx`.
- **YouTube** — legacy embeds via `youtubeUrl` field. YouTube iframe.

R2 bucket: `tap-and-swipe-videos`. CSP headers allow `*.r2.dev` and `videos.tap-and-swipe.com`.

### Cron Jobs

All protected by `CRON_SECRET` header.

- `/api/cron/discord-trials` — revokes Discord roles when 30-day trial periods expire.
- `/api/cron/daily-stats` — pulls mobile app download counts + RevenueCat events, posts summary to Discord.
- `/api/cron/lead-reminders` — sends follow-up reminders for quiz leads.

### Analytics

- **PageEvent tracking** (`/api/event`): custom funnel events per product, deduplicated by visitorId (cookie, 1yr) + sessionId (per-session). Products: `aso`, `aso-solo`, `aso-pro`, `community`, `bundle-aso`, `bundle-community`. Event types: `page_view`, `cta_clicked`, `stripe_shown`, `paid`, `trial_started`.
- **QuizEvent**: tracks quiz funnel progression (page_view, quiz_start, quiz_complete, booking_click).
- **Daily stats** (`lib/compute-daily-stats.ts`): pulls mobile app download counts via the Google Analytics Data API (`lib/firebase-ga4.ts`), combines with RevenueCat events, and posts summaries to Discord.

### Geo-Based Routing

`next.config.ts` redirects India/Brazil traffic from `/app-sprint` to `/app-sprint-community` using Cloudflare's `cf-ipcountry` header. The same header is read in checkout flows and stored in PageEvent records.

### Drafts

Long-form content (episodes, case studies) can be authored in private at `/drafts/{id}` before going live. Drafts live in `content/drafts/{id}.mdx`, render via `app/(site)/drafts/[id]/page.tsx`, and reuse the same `<EpisodeContent>` renderer as published episodes.

**Privacy guarantees**: drafts are excluded from the sitemap (`app/sitemap.ts`), RSS (`app/rss.xml/route.ts`), homepage (`app/(site)/page.tsx`), and the `/episodes` listing — all of which read `content/episodes/`, never `content/drafts/`. The route also sets `robots: { index: false, follow: false, nocache: true }` and uses `dynamic = "force-dynamic"` (no static generation). `/drafts` is in the robots.txt disallow list. The id is a random 8-char hex (~4B values) so the URL is unguessable, but it's not a real auth boundary — anyone with the URL can view it. Don't put truly sensitive material in a draft.

**Workflow**:

```bash
npx tsx scripts/new-draft.ts "My title"            # writes content/drafts/{id}.mdx, prints URLs
# edit the file, share /drafts/{id} for review
npx tsx scripts/publish-draft.ts {id} {slug}             # episode only
npx tsx scripts/publish-draft.ts {id} {slug} --case-study  # case study only
npx tsx scripts/publish-draft.ts {id} {slug} --pair        # both, cross-linked
```

`--pair` is the typical mode: the long-form draft body becomes the case study, and a minimal episode shell is written at the same slug with `caseStudySlug` / `episodeSlug` already wired up. Edit the episode after to add the `youtubeId` and any video-specific intro.

Frontmatter shape matches an episode (`title`, `description`, `date`, `guest`, `guestInfo`, `youtubeId`, `appSlug`, `appStoreId`, `playStoreId`, `revenueAtRecording`, `recordedAt`, `tags`, `image`). The publish script strips empty-string fields so the production mdx isn't polluted with scaffold blanks, and drops platform-specific fields (`youtubeId` from case studies, `updatedDate`/`imageAlt`/`episodeSlug` from episodes). After publishing with `appSlug` + store IDs, run `scripts/update-app-data.ts` once locally to populate the app card JSON (see next section).

### Episode & Case Study App Cards

Episode and case-study pages render `<AppShowcase>` (`components/app-showcase.tsx`) showing the featured app's icon, screenshots, rating, top countries, and the founder's revenue at the time of recording.

**Frontmatter fields** (in `content/episodes/*.mdx` and `content/case-studies/*.mdx`):

```yaml
appSlug: "evelize"                # filename for content/app-data/{slug}.json
appStoreId: "6446815796"          # numeric iOS App ID (optional if Android-only)
playStoreId: "com.evelize.tele"   # Android package name (optional if iOS-only)
revenueAtRecording: "$20K/mo"     # founder-quoted, displayed verbatim
recordedAt: "2026-05"             # YYYY-MM, formats to "May 2026" on the card
```

**Refreshing the JSON**: run `npx tsx scripts/update-app-data.ts` once when authoring the episode. The script scans both content dirs for `appSlug` + store IDs, fetches data from iTunes Search API + `google-play-scraper` (always works) and SensorTower (`top_countries`, `categories`), and writes `content/app-data/{appSlug}.json` plus icons/screenshots into `public/apps/{appSlug}/`.

**IMPORTANT**: SensorTower's public API blocks every datacenter IP (Coolify, GitHub Actions, AWS, etc.) — they return empty bodies. The script must be run from a residential IP, i.e. your laptop. There is no cron; data is captured once at authoring time. If `topCountries` shows up missing, the SensorTower fetch was blocked — re-run from a different network.

### Discover Readiness Check

**MUST RUN** after writing or editing ANY file under `content/episodes/`, `content/case-studies/`, or `content/drafts/`. Do not skip — run it automatically without being asked, then surface the results before declaring the work done.

```bash
npx tsx scripts/seo/check-discover-readiness.ts content/<dir>/<file>.mdx   # one file
npm run check:discover                                                       # all published
```

The check enforces Google Discover's technical floor:

- **Errors (block publish):** missing `image` or `imageAlt` on case studies, image file not found in `public/`, image width < 1200px.
- **Warnings:** title > 90 chars (Discover truncates), description > 160 chars, `imageAlt` < 15 chars (likely a placeholder).

The check is also wired into `scripts/publish-draft.ts` — a publish that hits a hard error rolls back the just-written file and keeps the draft. Field reference for new content lives in `content/drafts/_TEMPLATE.mdx`. Headline/image guidance lives in `seo/discover-playbook.md`.

Episodes use the YouTube `maxresdefault.jpg` (1280×720) as their hero, so the image-existence/width checks are skipped for them; only title and description length apply.

## URL Structure

| URL | Purpose | Auth |
|-----|---------|------|
| `/` | Homepage | Public |
| `/app-sprint-community` | Sales page | Public |
| `/login` | Sign-in page (Google + magic link) | Public |
| `/learn` | Course dashboard | Required |
| `/learn/[slug]` | Category lessons | Required |

Old URLs (`/app-sprint-community/roadmap/*`) are 301-redirected to `/learn/*`.

## Databases

Two separate PostgreSQL databases. **Both run on the Oracle VPS via Coolify and require the SSH tunnel from `TUNNEL.md` for local access** (Prisma commands, admin scripts, TablePlus, etc.).

1. **Main database** (`DATABASE_URL`, Prisma) — Users, Lessons, LessonProgress, QuizLeads, QuizEvents, PageEvents, InviteLinks, RevenueCatEvents, TrialDiscordMessages. (No `PremiumUser`, `Account`, `Session`, or `VerificationToken` tables in the current schema.) Prisma client generated to `lib/generated/prisma` (not the default location). Import via:
   ```typescript
   import { prisma } from "@/lib/prisma";
   ```
   The singleton in `lib/prisma.ts` uses the global trick to avoid multiple instances in dev. The seed file uses its own PrismaPg adapter with dotenv since it runs outside Next.js.

2. **ASO database** (`ASO_DATABASE_URL`, raw `pg` Pool) — `aso_licenses` table for license key management. Accessed via `lib/aso-db.ts` with raw SQL queries (no Prisma).

Clean schema: no legacy table name mappings. Table names match model names directly.

### DB Backup

Daily backups to Cloudflare R2 via `scripts/backup-db.sh`. 30-day rolling retention.

## SEO

This site takes an SEO-first approach. Every public page must have proper metadata, structured data, and canonical URLs.

### Metadata

Every public page exports either a static `metadata` object or a `generateMetadata` function. The root layout (`app/layout.tsx`) sets site-wide defaults: title template (`%s — Tap & Swipe`), Open Graph, Twitter cards, robots directives, and canonical URL. Page-level metadata overrides these defaults. All 35+ public pages define canonical URLs via `alternates.canonical`.

### Structured Data (JSON-LD)

JSON-LD is injected via `<script type="application/ld+json">` tags, rendered inline as React components:

- **Organization** — root layout (`app/layout.tsx`): company info, founder, social profiles, legal entity.
- **Course + AggregateRating + Reviews** — `components/AppSprintJsonLd.tsx`: AppSprint course schema with real reviews and ratings.
- **FAQPage** — `components/FaqJsonLd.tsx`: FAQ section on the community page.
- **VideoObject + BreadcrumbList** — episode detail pages (`app/(site)/episodes/[slug]/page.tsx`): YouTube embed metadata and breadcrumb navigation.
- **BlogPosting + BreadcrumbList** — case study pages (`app/(site)/case-studies/[slug]/page.tsx`): article metadata with publish/modified dates and breadcrumbs.

When adding new public pages, always include the appropriate schema type and breadcrumb trail.

### Sitemap & Robots

- `app/sitemap.ts` — dynamic sitemap including all episodes, case studies, product pages, and legal pages. Episodes and case studies are generated from their content directories.
- `app/robots.ts` — allows all crawlers on `/`, disallows `/api/` and `/learn` (gated content).
- RSS feed at `app/rss.xml/route.ts`.

### LLMs.txt & AI Discoverability

`public/llms.txt` provides a structured summary of the site for AI crawlers (GPTBot, ClaudeBot, PerplexityBot). It includes page descriptions, social links, and citation instructions. Served at both `/llms.txt` and `/.well-known/llms.txt` (via a rewrite in `next.config.ts`).

### IndexNow

`scripts/indexnow.ts` submits URLs to search engines for instant indexing. A GitHub Actions workflow (`.github/workflows/indexnow.yml`) can trigger this on deploy.
