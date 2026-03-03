import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface Lesson {
  category: string;
  title: string;
  description: string;
  type: "video" | "markdown";
  youtubeUrl?: string | null;
  markdownContent?: string | null;
  sectionType?: string | null;
  order: number;
}

const lessons: Lesson[] = [
  // Getting Started
  {
    category: "getting-started",
    title: "Welcome to the roadmap",
    description: "What you'll learn and how the course works",
    type: "video",
    youtubeUrl: "https://youtu.be/Zq37It_smAk",
    order: 1,
  },
  {
    category: "getting-started",
    title: "Tools & setup",
    description: "Everything you need before you start building",
    type: "video",
    youtubeUrl: "https://youtu.be/Bd1WvyJEEuU",
    markdownContent: `Get **20% off [Astro](https://tryastro.app/?aff=GPEbM)** (the ASO tool) using code **WELCOMEBACK** through this link!

Apply for the [Apple Small Business Program](https://developer.apple.com/app-store/small-business-program/) immediately. Apple takes 15% instead of 30%. Free money.`,
    order: 2,
  },

  // Find Your Idea
  {
    category: "find-your-idea",
    title: "How to find app ideas that actually make money",
    description: "Identify app ideas with real demand and revenue potential",
    type: "video",
    youtubeUrl: "https://youtu.be/QkPxS-2tzXk",
    markdownContent: `Check revenue on [appstoretracker.com](https://appstoretracker.com). You want decent MRR with a good MRR-to-downloads ratio. If a basic app makes money in a niche, the niche works.`,
    order: 1,
  },
  {
    category: "find-your-idea",
    title: "ASO basics: pick keywords that get you discovered",
    description: "Use keyword research to validate demand before building",
    type: "video",
    youtubeUrl: "https://youtu.be/xqvQHfgc5fg",
    markdownContent: `Find keywords with popularity above 20 and difficulty below 50 (US).

Get **20% off [Astro](https://tryastro.app/?aff=GPEbM)** (the ASO tool) using code **WELCOMEBACK** through this link!`,
    order: 2,
  },
  {
    category: "find-your-idea",
    title: "How to structure your app name & subtitle",
    description: "Craft a name and subtitle that rank and convert",
    type: "video",
    youtubeUrl: "https://youtu.be/nd5WYlCBTSo",
    markdownContent: `**Title formula:** \`[Main keyword] - [App name]\`. Example: "Daily Affirmations - Glow"

The keyword part is what gets you found in search. The brand name is optional.

**Subtitle:** your next best keywords. 2-4 keywords that describe your app's value.

Never repeat the same keywords in title and subtitle. Use different ones in each to double your coverage.`,
    order: 3,
  },
  {
    category: "find-your-idea",
    title: "The 3-day validation test",
    description: "Validate your idea in 3 days before writing any code",
    type: "video",
    youtubeUrl: "https://youtu.be/wyPI__lwxn0",
    markdownContent: `Apple gives you roughly 3 days of visibility boost when you launch.

If keywords + onboarding + real need are solid, expect 10-15 trial signups in those 3 days.

Even 1-2 paid conversions means you're on the right track. Zero conversions means the idea doesn't work or your onboarding needs fixing.`,
    order: 4,
  },

  // Design
  {
    category: "design",
    title: "Design your app without being a designer",
    description: "Use AI and reference apps to create pro-level designs",
    type: "video",
    youtubeUrl: "https://youtu.be/Wt2Pcxw3JaY",
    markdownContent: `Tools mentioned in this video:

- [Screens Design](https://screensdesign.com/create)
- [Stitch by Google](https://stitch.withgoogle.com/)`,
    order: 1,
  },
  {
    category: "design",
    title: "Design an onboarding that converts",
    description: "Build an onboarding flow that turns new users into paying customers",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=sHzbhQaHIOw",
    markdownContent: `Request access to the Figma file in the video [on Figma](https://www.figma.com/design/8GdnmiuajF78ioSqTxk4dJ/Bible-Prayer-Widget?node-id=0-1&t=cQMEvr0iKEcsjJbi-1)

Cal AI onboarding analysis: [on Figma](https://www.figma.com/board/vXMqEHxmISELkKGXZF0beB/Cal-AI-s-Onboarding---Broken-down--Community-?node-id=0-1&p=f&t=37sbAsP5TkuMFN5i-0)`,
    order: 2,
  },
  {
    category: "design",
    title: "Your first App Store screenshot is everything",
    description: "Design screenshots that stop the scroll and convert",
    type: "video",
    youtubeUrl: "https://youtu.be/JpGDFBlkdd8",
    markdownContent: `Tools mentioned in this video:

- [The App Launchpad](https://theapplaunchpad.com/projects)
- [App Store Screenshots Template (Figma)](https://www.figma.com/community/file/1165594034578098226)`,
    order: 3,
  },

  // Build (basic — no boilerplate required)
  {
    category: "build",
    title: "From zero to running app with Expo + AI tools",
    description: "Set up your dev environment and create your first Expo app",
    type: "video",
    youtubeUrl: null,
    order: 1,
  },
  {
    category: "build",
    title: "App Store Connect setup",
    description: "Configure your app in App Store Connect for submission",
    type: "video",
    youtubeUrl: "https://youtu.be/vK2sJO6TrUk",
    order: 2,
  },
  {
    category: "build",
    title: "Submitting your first build to TestFlight",
    description: "Build, upload, and test your app via TestFlight",
    type: "video",
    youtubeUrl: "https://youtu.be/qMoPSXUm6LQ",
    order: 3,
  },
  {
    category: "build",
    title: "Set up Sentry, PostHog & Supabase",
    description: "Add crash monitoring, analytics, and a backend to your app",
    type: "markdown",
    markdownContent: `Three services you should set up before launch: **Sentry** for crash monitoring, **PostHog** for analytics and AB testing, and **Supabase** for your backend.

---

## Sentry — crash monitoring

Go to [sentry.io](https://sentry.io) and create a free account. Create a new project, select **React Native**, and follow the setup wizard.

Sentry catches crashes and errors in production so you know what's breaking before users complain.

\`\`\`bash
npx expo install @sentry/react-native
\`\`\`

Wrap your app entry with \`Sentry.init()\` using your DSN from the Sentry dashboard. That's the minimum setup — you'll get crash reports immediately.

---

## PostHog — analytics & AB testing

Go to [posthog.com](https://posthog.com) and create a free account (generous free tier: 1M events/month).

\`\`\`bash
npx expo install posthog-react-native
\`\`\`

Initialize PostHog with your project API key and instance URL. Then track events with \`posthog.capture('event_name')\`.

PostHog also supports **feature flags** and **AB tests** out of the box — you can test different paywalls, onboarding flows, and pricing without shipping new builds.

---

## Supabase — backend & database

Go to [supabase.com](https://supabase.com) and create a free account (big free tier, 2 projects). Click **New Project**, pick a name and a region close to your users, set a database password (save it somewhere), and hit **Create**.

Wait a minute for the project to spin up.

### Set up the database

From the left sidebar, click **SQL Editor**. Paste the following and hit **Run**:

\`\`\`sql
-- Onboarding responses table
create table onboarding_responses (
  id bigint generated always as identity primary key,
  revenuecat_user_id text not null unique,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Feedback table
create table feedback (
  id bigint generated always as identity primary key,
  revenuecat_user_id text not null,
  comment text,
  context jsonb,
  created_at timestamptz default now()
);

-- Auto-update updated_at on onboarding_responses
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger onboarding_responses_updated_at
  before update on onboarding_responses
  for each row execute function update_updated_at();

-- Enable RLS
alter table onboarding_responses enable row level security;
alter table feedback enable row level security;

-- Allow inserts/upserts from anon key
create policy "Allow anon insert" on onboarding_responses for all using (true) with check (true);
create policy "Allow anon insert" on feedback for all using (true) with check (true);
\`\`\`

### Get your API keys

Go back to the Supabase dashboard home page. Click on the **Connect** button under your project name at the top. Select the **API Keys** tab.

You need two values for your app:

- **Project URL** — looks like \`https://xxxxx.supabase.co\`
- **Anon Key** — the long JWT string (this is safe to embed in your app, RLS protects your data)

Copy both into your app's environment variables. That's it, your backend is ready.`,
    order: 4,
  },

  // Build with the boilerplate (premium)
  {
    category: "build-with-boilerplate",
    title: "What is App Sprint's boilerplate?",
    description: "An overview of the boilerplate and how it accelerates your launch",
    type: "video",
    youtubeUrl: "https://youtu.be/m10gr6S05yA",
    order: 1,
  },
  {
    category: "build-with-boilerplate",
    title: "Connect your GitHub account",
    description: "Link your GitHub to get access to the private boilerplate repository",
    type: "markdown",
    sectionType: "github-connect",
    order: 2,
  },
  {
    category: "build-with-boilerplate",
    title: "How to setup YOUR Github repository",
    description: "Clone the boilerplate and configure it for your app",
    type: "video",
    youtubeUrl: "https://youtu.be/k-WnuXjg9yg",
    markdownContent: `## Install Git on Mac

Open Terminal and run:

\`\`\`bash
xcode-select --install
\`\`\`

A popup appears. Click **Install**. Wait for it to finish (a few minutes).

Verify it worked:

\`\`\`bash
git --version
\`\`\`

You should see something like \`git version 2.x.x\`. That's it, Git is ready.

---

## Configure Git (one time)

Tell Git who you are. Use the same email as your GitHub account:

\`\`\`bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
\`\`\`

Done. You can now clone repos, push code, and use Git anywhere on your Mac.`,
    order: 3,
  },
  {
    category: "build-with-boilerplate",
    title: "How to setup App Store Connect",
    description: "Configure your app in App Store Connect for submission",
    type: "video",
    youtubeUrl: "https://youtu.be/XIffw1V3XD0",
    order: 4,
  },
  {
    category: "build-with-boilerplate",
    title: "How to setup App Sprint's boilerplate",
    description: "Step-by-step setup of the boilerplate for you project",
    type: "video",
    youtubeUrl: "https://youtu.be/GJrtl5IfTfU",
    markdownContent: `\`\`\`bash
git clone https://github.com/App-Sprint/expo-boilerplate.git
\`\`\``,
    order: 5,
  },
  {
    category: "build-with-boilerplate",
    title: "How to use Claude Code with the boilerplate?",
    description: "Use AI-assisted coding to build features faster",
    type: "video",
    youtubeUrl: "https://youtu.be/iK2slCBbNsQ",
    order: 6,
  },
  {
    category: "build-with-boilerplate",
    title: "RevenueCat setup (+ link it to App Store Connect)",
    description: "Set up in-app subscriptions and entitlements",
    type: "video",
    youtubeUrl: "https://youtu.be/xXAJJD_F8fg",
    order: 7,
  },
  {
    category: "build-with-boilerplate",
    title: "Sentry setup",
    description: "Add crash monitoring and error tracking",
    type: "video",
    youtubeUrl: "https://youtu.be/Dg9_gvYCRVQ",
    order: 8,
  },
  {
    category: "build-with-boilerplate",
    title: "PostHog setup",
    description: "Add analytics and AB testing to your app",
    type: "video",
    youtubeUrl: null,
    order: 9,
  },
  {
    category: "build-with-boilerplate",
    title: "Tenjin setup (+ link it to RevenueCat)",
    description: "Add attribution tracking for your ad campaigns",
    type: "video",
    youtubeUrl: "https://youtu.be/zfPpXfqzY7w",
    markdownContent: `# Testing Tenjin Attribution

## 1. Build on a real device

Tenjin requires a physical device — it won't work on the simulator.

\`\`\`bash
# Generate native iOS project
npx expo prebuild -p ios

# Open in Xcode
xed ios
\`\`\`

In Xcode:
1. Select your physical device in the device dropdown
2. Set your signing team under **Signing & Capabilities**
3. Hit **Cmd+R** to build and run

## 2. Get your device IDFV

Once the app is running on your device:

1. Complete onboarding
2. Go to **Settings → Show Device IDs**
3. Copy the IDFV from the alert or the terminal log: \`[Device ID] IDFV: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX\`

## 3. Register as a test device in Tenjin

1. Go to [Tenjin Dashboard → Diagnose → Test Devices](https://dashboard.tenjin.com/dashboard/debug_app_users)
2. Click **Add Test Device**
3. Select your app
4. Give it any name (e.g. "My iPhone")
5. Select **iOS** as the device type
6. Select **IDFV** as the ID type
7. Paste the IDFV from the logs

## 4. Send a test event

In the app:

1. Go to **Settings → Send Tenjin Test Event**
2. Check the terminal for: \`[Tenjin] Sent test_event_from_settings\`

## 5. Verify in Tenjin Dashboard

1. Go to [Diagnose → SDK Live Data](https://dashboard.tenjin.com/dashboard/sdk_diagnostics)
2. You should see \`test_event_from_settings\` from your device
3. It may take a few minutes to appear

## Troubleshooting

- **No events appearing**: Check that ATT permission was granted (Settings → ATT Status). Tenjin needs tracking permission on iOS 14.5+.
- **SDK not initialized**: Tenjin initializes after RevenueCat is ready. Check terminal for \`Tenjin SDK initialized and connected\`.
- **Wrong API key**: Verify \`EXPO_PUBLIC_TENJIN_API_KEY\` in your \`.env\` file matches the Tenjin dashboard.`,
    order: 10,
  },
  {
    category: "build-with-boilerplate",
    title: "Firebase setup (+ link it to RevenueCat)",
    description: "Add push notifications and remote config",
    type: "video",
    youtubeUrl: "https://youtu.be/PGSJ1VmtN_I",
    order: 11,
  },
  {
    category: "build-with-boilerplate",
    title: "Supabase setup",
    description: "Add a database, auth, and real-time backend",
    type: "video",
    youtubeUrl: "https://youtu.be/GWdkZ6Ov1L4",
    markdownContent: `\`\`\`sql
-- Onboarding responses table
create table onboarding_responses (
  id bigint generated always as identity primary key,
  revenuecat_user_id text not null unique,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Feedback table
create table feedback (
  id bigint generated always as identity primary key,
  revenuecat_user_id text not null,
  comment text,
  context jsonb,
  created_at timestamptz default now()
);

-- Auto-update updated_at on onboarding_responses
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger onboarding_responses_updated_at
  before update on onboarding_responses
  for each row execute function update_updated_at();

-- Enable RLS
alter table onboarding_responses enable row level security;
alter table feedback enable row level security;

-- Allow inserts/upserts from anon key
create policy "Allow anon insert" on onboarding_responses for all using (true) with check (true);
create policy "Allow anon insert" on feedback for all using (true) with check (true);
\`\`\``,
    order: 12,
  },
  {
    category: "build-with-boilerplate",
    title: "Checking your installation",
    description: "Verify everything is properly configured before moving on",
    type: "video",
    youtubeUrl: "https://youtu.be/_fe6wyflDhw",
    order: 13,
  },

  // Monetize
  {
    category: "monetize",
    title: "Set up subscriptions with RevenueCat",
    description: "Configure in-app subscriptions and manage entitlements",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=bhF0Pbu_ROc",
    order: 1,
  },
  {
    category: "monetize",
    title: "Paywall strategy: the 3-step onboarding that converts",
    description: "Design an onboarding flow that leads to purchases",
    type: "video",
    youtubeUrl: "https://youtu.be/OH4U5jTMNks",
    order: 2,
  },
  {
    category: "monetize",
    title: "AB test everything",
    description: "Run experiments on pricing, copy, and layout",
    type: "video",
    youtubeUrl: null,
    order: 3,
  },
  {
    category: "monetize",
    title: "Price smarter: localized pricing with PriceLocalize",
    description: "Maximize revenue by adapting prices per region",
    type: "markdown",
    markdownContent: `By default, Apple auto-converts your US price to other currencies. Sounds convenient. It's actually leaving money on the table.

## The problem

$4.99/week in the US is reasonable. But that same price auto-converted to Brazilian Real, Indian Rupee, or Turkish Lira? It's unaffordable for most users in those countries. They see the price, they leave. You just lost a customer who would've paid if the price made sense for their market.

## The solution: purchasing power parity

[PriceLocalize](https://pricelocalize.com/) is a Mac app that helps you set prices based on purchasing power parity (PPP), using the Netflix Index. The idea is simple: charge what people can actually afford in each country, relative to their local economy.

It has a great free trial, try it before you commit.

## How it works

1. Set your base US price (this is your anchor)
2. PriceLocalize calculates adjusted prices for every country Apple supports
3. You review and apply the suggested prices in App Store Connect

That's it. You end up with prices that feel fair in every market instead of prices that only make sense in the US.

## Why it matters

- **More conversions worldwide.** Users in lower-income countries actually subscribe instead of bouncing.
- **More total revenue.** 100 users paying $1.99 in India beats 0 users paying $4.99 in India.
- **Better rankings.** More downloads and conversions = better App Store ranking in those countries = more organic traffic.

## Real example

Your US price: **$4.99/week**

Without PriceLocalize (Apple auto-convert):
- Brazil: R$24.90/week, too expensive for most users
- India: \u20B9449/week, way out of range
- Norway: 49 kr/week, actually fine, strong economy

With PriceLocalize (PPP-adjusted):
- Brazil: R$12.90/week, reasonable, converts
- India: \u20B9149/week, affordable, users subscribe
- Norway: 49 kr/week, stays the same

You're not discounting. You're pricing intelligently.

## When to do this

Set your localized prices **before launch** if possible. If your app is already live, do it now. You'll see the impact almost immediately in countries where you had high impressions but low conversions.

## Quick steps

1. Download PriceLocalize from [pricelocalize.com](https://pricelocalize.com/)
2. Connect your App Store Connect account
3. Enter your base US subscription prices
4. PriceLocalize automatically updates all country prices based on the Netflix Index

$5/week feels different than 40kr/week. Price for the market, not just for the US. It's one of the easiest wins you'll ever get.`,
    order: 4,
  },

  // Launch & Grow
  {
    category: "launch-and-grow",
    title: "ASO after launch",
    description: "Optimize your listing based on real data",
    type: "video",
    youtubeUrl: "https://youtu.be/ujwN2dGdUmU",
    order: 1,
  },
  {
    category: "launch-and-grow",
    title: "Apple Ads: your first campaign setup",
    description: "Set up Apple Search Ads to drive targeted installs",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=3OtfqONYR80",
    order: 2,
  },
  {
    category: "launch-and-grow",
    title: "Target any country on TikTok with a VPN",
    description: "Reach international audiences by geo-targeting your TikTok content",
    type: "markdown",
    markdownContent: `TikTok decides which country you belong to based on two things: your ASN (who owns your internet connection) and your GEO (which country your IP resolves to). Get either wrong and your content gets shown to the wrong audience, or worse, gets suppressed entirely.

---

## Setup guides

Detailed Notion walkthroughs:

- Hostinger setup: [Notion guide](https://capable-oak-5a9.notion.site/Set-up-your-own-Tiktok-VPN-on-Mac-For-beginners-3006f6d8ab3d802b9dd0f4bba07e1a2e)
- DigitalOcean setup (beginner friendly): [Notion guide](https://separate-quart-3d6.notion.site/TikTok-USA-VPN-via-DigitalOcean-306806fd6a11801c94bbf8bb454f2083)

---

## What TikTok actually checks

Most people think a VPN is enough. It's not. TikTok cross-checks multiple signals.

ASN (Autonomous System Number) is who owns your internet connection. Think of it as your digital passport. If your ASN says "French telecom provider" but your content targets the US, TikTok notices.

GEO is the country your IP resolves to. This is your face at the border. TikTok checks both, and if they don't match, you're flagged.

How to verify before opening TikTok:
- GEO + ASN check: [geo.brdtest.com/mygeo.json](https://geo.brdtest.com/mygeo.json)
- ISP verification: [bgp.he.net](https://bgp.he.net/)

Both must show your target country. If either is wrong, fix your connection first. Never "test anyway."

---

## Device preparation (before installing TikTok)

This must happen BEFORE TikTok touches your device. If you install first, TikTok already fingerprinted your real location.

1. Factory reset your phone (Settings > General > Transfer or Reset iPhone > Erase All Content and Settings). You need a completely blank device with no previous location data.
2. Create a brand new iCloud account during setup. Don't sign in with your existing one — Apple ties location history to your iCloud account.
3. Remove your SIM card (or use a device without one). TikTok uses carrier info to detect your real country.
4. Set your device region to match your target country (Settings > General > Language & Region).
5. Set your timezone to match your target location. If targeting US, use Eastern Time or Pacific Time. TikTok weighs posting timing and engagement timing against your timezone.
6. Set language to English (or your target country's language).
7. Connect your proxy/VPN and verify ASN + GEO are correct using the tools above.
8. Only then download TikTok. The app must be installed while your connection is already clean.

---

## Creating your account

1. Install TikTok fresh. If previously installed, delete completely and reinstall.
2. Verify the country code when the phone number field appears. It must match your target region. This is a dead giveaway if it's wrong.
3. Sign up with email, not phone number. Phone numbers are tied to your real country and harder to match with your target GEO. If you're on iPhone, "Sign in with Apple" is even better (higher trust, device-verified identity).
4. Check your For You Page. It should show content from your target region in the right language. If you see content from your real country, something is wrong. Start over.
5. Don't touch your profile yet. No bio, no picture, no username changes. We'll do that during warmup.

---

## IP fraud scores: ignore them

You might see people obsess over tools like IPQualityScore, Scamalytics, or IPFighter. From large-scale testing: high fraud score does NOT equal low reach. Low fraud score does NOT equal high reach. Zero correlation with virality.

These tools were built for payment fraud detection, not content distribution. TikTok doesn't use them. Don't rotate or discard IPs based on fraud scores.

What matters is ASN + GEO consistency. That's it.

---

## Red flags TikTok watches for

Immediate red flags: non-target GEO + target country content, posting during your target country's sleep hours (2-5 AM), device timezone mismatch, rapid IP changes, switching GEO mid-lifecycle.

Silent killers: correct IP but wrong browsing patterns (scrolling non-target content), mixed language For You Page, local creators from your real country dominating your feed.

If you see mixed language content or local creators from your real country, your account is mis-trained. Fix it during warmup or reset.

---

## Posting windows (US FYP)

If targeting the US, these windows have been tested repeatedly:

- 7-9 AM Eastern
- 11 AM-1 PM Eastern
- 6-9 PM Eastern

Avoid posting between 2-5 AM Eastern. If you're consistently getting under 300 views outside these windows, re-align your posting schedule.

---

## Quick checklist

Before creating your account, verify ALL of these:

- [ ] SIM card removed (or no-SIM device)
- [ ] Device region set to target country
- [ ] Device timezone set to target location
- [ ] Device language set correctly
- [ ] Proxy/VPN connected and active
- [ ] ASN verified on bgp.he.net (matches target country)
- [ ] GEO verified on geo.brdtest.com/mygeo.json (matches target country)
- [ ] TikTok freshly installed AFTER proxy was active
- [ ] Signing up with email or Sign in with Apple (not phone number)
- [ ] For You Page shows target country content

If your For You Page shows local content from your target country, you're good. Move on to the account warmup guide.`,
    order: 3,
  },
  {
    category: "launch-and-grow",
    title: "Warm up a fresh TikTok account",
    description: "Build trust with the algorithm before posting content",
    type: "markdown",
    markdownContent: `TikTok profiles your account before it rewards you. Every scroll, every like, every search teaches TikTok who you are. If you skip warmup and start posting immediately, TikTok has no data about you. Your content gets tested in the wrong bucket, gets suppressed, and the account never recovers.

Warmup is not about reach. Warmup is about trust calibration.

---

## Why you can't just start posting

New accounts have zero trust. When you post immediately, TikTok has no persona data on you, your content is tested against the wrong audience, early failures poison your account's graph permanently, and you get inconsistent reach that never stabilizes.

Accounts that survive long term move slowly early and build consistent signals. Accounts that die rush posting, rush engagement, rush promotion.

---

## Phase 0: the lurker (Days 1-2)

Goal: establish who this account represents without producing any content.

Open TikTok 3-4 times per day. Scroll for 10-15 minutes per session. No posting, no commenting, no profile edits (no bio, no picture yet), no DMs.

Scroll like a real user in your target country. Pause on content related to your niche. Watch 80-100% of videos you're interested in. Skip irrelevant content quickly but naturally. Let some videos auto-loop. Rewatch clips you genuinely find interesting.

Watch time matters more than likes. TikTok weighs watch completion heavily. Complete videos. Rewatch some. Let videos loop occasionally. This tells TikTok what you care about far more than tapping a heart.

Follow limits: 5-10 follows per day maximum, spread across your sessions (not all at once). Don't follow only big accounts. Don't unfollow anyone during warmup.

If after Day 2 your For You Page consistently shows non-target language content, or your niche feed is completely mixed with unrelated stuff, or ads dominate your feed abnormally: reset the account and start over. Don't "wait and see." Bad signals compound silently.

---

## Phase 1: training the algorithm (Days 3-5)

Goal: reinforce your persona and lock in your niche. Still no posting.

2-3 scrolling sessions per day. Targeted engagement only. Light commenting (see below).

Use search actively. Search is one of the strongest signals you can send TikTok. Search niche keywords manually ("daily affirmations," "self care routine," "morning motivation," whatever your app's niche is). Click multiple results. Watch top performing videos all the way through. Don't search trending generic stuff or random curiosity topics. Stay in your niche.

Start commenting carefully. Comments train your persona faster than likes. 1-2 comments per session maximum. Short, neutral comments. No emoji spam. No controversial takes yet. Good comments: "this makes sense," "never thought about it this way," "this explains a lot." Bad comments: long replies, jokes, hot takes, anything with lots of emojis.

Move to Phase 2 when your FYP is roughly 70% niche-aligned, creators are mostly from your target country, and language and tone match your target audience. If this isn't the case by Day 5, keep doing Phase 1.

---

## Phase 2: first posts (Days 5-7)

1. Upload a profile picture (neutral, no logos, no stock photos).
2. Write a generic bio. No selling, no links, no emoji spam. Something like "sharing thoughts on [niche]" or "interested in [topic]." Don't mention your app.
3. Post 2-3 pieces of content. Image slideshows work best for first posts. They're low risk, generate natural watch time, and reduce production friction. Save the fancy videos for later. Simple, niche-relevant, value-driven.

### The 700-view health test

Wait 24-48 hours after posting and check your views.

700+ views: your account is healthy. Keep going.
300-700 views: inconclusive. Post a few more and re-evaluate.
Under 300 views: your account is likely compromised. If 3+ posts all land under 300, consider starting fresh.

Most people think their account is dead when really their content just isn't hitting. Content failure: some formats work, new hooks still get tested, reach returns when you change approach. Account failure: everything stalls, even proven formats get under 300 views, no recovery after multiple tests.

---

## After warmup: ongoing rules

1-2 posts per day per account. Maximum 3 during expansion phases when something is working. Post during target country's active hours (7-9 AM, 11 AM-1 PM, 6-9 PM Eastern for US).

Don't change your bio, username, or profile photo frequently. Don't add links until you have consistent traction (and ideally 1000+ followers for the link-in-bio feature).

Pause posting if you see consecutive low views, your FYP shifts to a different audience, or engagement drops suddenly. Pausing preserves account health. Pushing harder when things aren't working makes it worse.

Every content format has a lifecycle: early signal, expansion, saturation, decay. When a format stops working (6+ consecutive posts under your baseline), stop using it. Switch to something new. Formats are disposable.

Always post natively through the TikTok app. Don't use third-party scheduling tools for posting. They create metadata inconsistencies that TikTok detects. Vary your captions slightly between posts. Don't copy-paste identical descriptions or hashtags.

Don't push calls to action in your first seconds. Don't repeat CTAs every post. If you notice reach dropping after adding CTAs, remove them. Let curiosity drive installs. "What app is this?" comments are more powerful than any CTA.

---

## Recovery: when things go wrong

If views drop suddenly:
1. Stop posting that format
2. Check your connection (ASN + GEO still correct?)
3. Wait 48 hours
4. Test a completely different format

For struggling accounts:
1. Stop posting for 48 hours
2. Go back to Phase 1 behavior (scroll, search, comment in niche)
3. Post 1 simple slideshow
4. Wait 24 hours
5. Repeat up to 3 posts. If views bounce back, continue. If not, it might be time to start fresh.

Give up on an account when recovery has failed twice, your connection setup is clean, and the same content works on other accounts. Time is more valuable than sentiment. Keep going when at least one post shows improvement, your GEO is correct, and new formats still get tested by TikTok.

---

## Quick reference

During warmup (Days 1-5): 2-3 scroll sessions (10-15 min each), watch niche content fully, 5-10 follows max spread across sessions, 1-2 short neutral comments per session (Phase 1 only), no posting, no DMs, no profile changes, only during target country active hours.

After warmup (Day 5+): 1-2 posts per day natively through the app, continue engaging with niche content between posts, post during peak hours (7-9 AM, 11 AM-1 PM, 6-9 PM ET for US), monitor the 700-view baseline, rotate formats before they decay, don't add links or CTAs until you have consistent traction.

The lifecycle to keep in mind: setup > trust > test > scale > decay > rotate.

If you're stuck, you probably skipped a step.`,
    order: 4,
  },

  // Scaling (empty — placeholder)
  // No lessons for this category

  // Weekly Call Replays
  {
    category: "weekly-calls",
    title: "How to use Posthog and create AB tests",
    description: "Learn how to set up Posthog analytics and run AB tests",
    type: "video",
    youtubeUrl: "https://youtu.be/6uV_F1A97G4",
    order: 1,
  },
  {
    category: "weekly-calls",
    title: "ASO (AppStore Search Optimization) and Open Claw chat",
    description: "Deep dive into ASO strategies and open Q&A session",
    type: "video",
    youtubeUrl: "https://youtu.be/lEznPnBjn0E",
    order: 2,
  },
];

const PREMIUM_DISCORD_IDS = [
  process.env.ADMIN_DISCORD_ID!,
  "372167828964376577",
  "1295748700429357148",
];

async function main() {
  console.log("Seeding lessons...");

  for (const lesson of lessons) {
    await prisma.lesson.upsert({
      where: {
        id: `seed-${lesson.category}-${lesson.order}`,
      },
      update: {
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        youtubeUrl: lesson.youtubeUrl ?? null,
        markdownContent: lesson.markdownContent ?? null,
        sectionType: lesson.sectionType ?? null,
      },
      create: {
        id: `seed-${lesson.category}-${lesson.order}`,
        category: lesson.category,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        youtubeUrl: lesson.youtubeUrl ?? null,
        markdownContent: lesson.markdownContent ?? null,
        sectionType: lesson.sectionType ?? null,
        order: lesson.order,
      },
    });
  }

  // Clean up orphaned build lessons (old build-5 through build-16)
  for (let order = 5; order <= 16; order++) {
    await prisma.lessonProgress
      .deleteMany({ where: { lessonId: `seed-build-${order}` } })
      .catch(() => {});
    await prisma.lesson
      .delete({ where: { id: `seed-build-${order}` } })
      .catch(() => {});
  }

  // Seed premium users
  console.log("Seeding premium users...");
  for (const discordId of PREMIUM_DISCORD_IDS) {
    if (!discordId) continue;
    await prisma.premiumUser.upsert({
      where: { discordId },
      update: { tier: "full" },
      create: { discordId, tier: "full" },
    });
  }

  console.log(`Seeded ${lessons.length} lessons + ${PREMIUM_DISCORD_IDS.length} premium users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
