# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint (flat config, next/core-web-vitals + next/typescript)
npx prisma generate  # Generate Prisma client (also runs on npm install via postinstall)
npx prisma db seed   # Seed lessons and premium users
npx prisma migrate dev  # Create and apply migrations
npx tsx scripts/<name>.ts  # Run admin scripts (grant-role, import-whop-users, register-discord-commands, test-email, migrate-to-clean-db)
```

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript, TailwindCSS 4, shadcn/ui (New York style, configured in `components.json`), PostgreSQL with Prisma ORM (@prisma/adapter-pg), Auth.js v5 (Google + email magic link) + legacy Discord OAuth, Cloudflare R2 for video hosting, Resend for email. Deployed as standalone Docker build.

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
- **Premium tiers** (`lib/premium.ts`): standard, boilerplate, full. Controls category access via an access matrix. PremiumUser table maps user IDs to tiers.
- **Invite links**: token-based system (InviteLink model) to grant premium tier access. Redemption creates a private Discord support channel with welcome messages.

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

Two separate PostgreSQL databases:

1. **Main database** (`DATABASE_URL`, Prisma) — Users, Accounts, Sessions, VerificationTokens, Lessons, LessonProgress, QuizLeads, QuizEvents, PageEvents, PremiumUsers, InviteLinks, RevenueCatEvents, TrialDiscordMessages. Prisma client generated to `lib/generated/prisma` (not the default location). Import via:
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
