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
npx tsx scripts/<name>.ts  # Run admin scripts (grant-role, import-whop-users, register-discord-commands, test-email)
```

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript, TailwindCSS 4, shadcn/ui (New York style, configured in `components.json`), PostgreSQL with Prisma ORM (@prisma/adapter-pg), Resend for email, jose for JWT sessions. Deployed as standalone Docker build.

## Architecture

### Multi-Product Site

This codebase is the landing + course platform for several products:

- **App Sprint Community** (`/app-sprint-community`) — the main product: a paid community + course roadmap teaching users to build and monetize iOS apps. Checkout via Stripe (`/api/checkout`) or Paddle (`/api/checkout/paddle`).
- **ASO product** (`/aso`) — App Store Optimization Mac app with its own Stripe checkout (`/api/aso/checkout`), license key system, and separate database (`ASO_DATABASE_URL`).
- **Bundles** — combined Community + ASO packages (`/api/checkout/bundle`, `/api/aso/checkout-bundle`).
- **Quiz funnel** (`/app-sprint` landing) — lead generation quiz that captures QuizLead records and routes leads to booking/WhatsApp.
- **App landing pages** — Divvy, NetPay, Versy, Lua, Glow each have privacy/terms/support pages. Content lives in `/content/{app-name}/` as Markdown files.

### Roadmap (Course Platform)

The roadmap at `/app-sprint/roadmap` is the core feature. Key pieces:

- **Categories** defined in `lib/roadmap.ts` — ordered list: getting-started, find-your-idea, design, build, build-with-boilerplate, monetize, launch-and-grow, scaling, weekly-calls.
- **Lessons** seeded via `prisma/seed.ts` with stable IDs `seed-{category}-{order}`. Each lesson is video or markdown type.
- **Progress** tracked per-user in LessonProgress (table: `VideoProgress`).
- **Premium tiers** (`lib/premium.ts`): standard, boilerplate, full. Controls category access via an access matrix — some categories are locked/hidden based on tier. PremiumUser table maps Discord IDs to tiers.
- **Invite links**: token-based system (InviteLink model) to grant premium tier access. Redemption creates a private Discord support channel with welcome messages.

**CRITICAL**: When adding lessons to `prisma/seed.ts`, ALWAYS append to the end of a category. Never insert in the middle or reorder — progress is tracked by `seed-{category}-{order}` IDs.

### Authentication

Discord OAuth is the primary auth. GitHub OAuth is secondary (linkable after Discord login for boilerplate repo access). Sessions are JWT cookies (`discord_session`) via jose with two TTLs:
- `10m`: default for new users going through checkout
- `7d`: for users with roadmap access (subscribers, premium users, invite holders)

Session helpers in `lib/session.ts`.

`middleware.ts` protects `/app-sprint/roadmap/*` — redirects to Discord OAuth if no valid session. **Auth is skipped entirely in development mode.**

### Payments

Multiple payment providers, each with webhook handlers in `/api/webhooks/`:

- **Stripe** — Community subscription (`/api/checkout`), ASO subscription (`/api/aso/checkout`), bundles. Community subscribers also get an ASO Pro license emailed automatically.
- **Paddle** — alternative Community checkout (`/api/checkout/paddle`).
- **Whop** — marketplace integration.
- **RevenueCat** — mobile in-app subscription events for the Glow and Bible apps. Stores RevenueCatEvent records (used for daily stats) and posts notifications to Discord. Does NOT update User records.

Stripe/Paddle/Whop webhooks update User records (subscriptionStatus, paymentProvider, roleGranted). The `roleGranted` flag is set when a Discord role is successfully granted.

### Discord Integration

Discord bot handles slash commands (`/stats`, `/invite`) via `/api/discord/interactions`. Webhook notifications via `lib/discord-webhook.ts`. When users subscribe, they get a Discord role. Invite redemption auto-creates a private support channel with welcome messages.

### Cron Jobs

- `/api/cron/discord-trials` — revokes Discord roles when 30-day trial periods expire. Protected by `CRON_SECRET` header.

### Analytics

- **PageEvent tracking** (`/api/event`): custom funnel events per product, deduplicated by visitorId (cookie, 1yr) + sessionId (per-session). Products: `aso`, `aso-solo`, `aso-pro`, `community`, `bundle-aso`, `bundle-community`. Event types: `page_view`, `cta_clicked`, `stripe_shown`, `paid`, `trial_started`.
- **QuizEvent**: tracks quiz funnel progression (page_view, quiz_start, quiz_complete, booking_click).
- **Daily stats** (`lib/compute-daily-stats.ts`): pulls mobile app download counts via the Google Analytics Data API (`lib/firebase-ga4.ts`), combines with RevenueCat events, and posts summaries to Discord.

### Geo-Based Routing

`next.config.ts` redirects India/Brazil traffic from `/app-sprint` to `/app-sprint-community` using Cloudflare's `cf-ipcountry` header. The same header is read in checkout flows and stored in PageEvent records.

## Databases

Two separate PostgreSQL databases:

1. **Main database** (`DATABASE_URL`, Prisma) — Users, Lessons, LessonProgress, QuizLeads, QuizEvents, PageEvents, PremiumUsers, InviteLinks, RevenueCatEvents, TrialDiscordMessages. Prisma client generated to `lib/generated/prisma` (not the default location). Import via:
   ```typescript
   import { prisma } from "@/lib/prisma";
   ```
   The singleton in `lib/prisma.ts` uses the global trick to avoid multiple instances in dev. The seed file uses its own PrismaPg adapter with dotenv since it runs outside Next.js.

2. **ASO database** (`ASO_DATABASE_URL`, raw `pg` Pool) — `aso_licenses` table for license key management. Accessed via `lib/aso-db.ts` with raw SQL queries (no Prisma).

Key table name mappings (Prisma model → actual table): Lesson → `Video`, LessonProgress → `VideoProgress`. These are legacy names kept for backward compatibility.
