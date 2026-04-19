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
    title: "What is AppSprint's boilerplate?",
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
    title: "How to setup AppSprint's boilerplate",
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
    title: "Target the US (or any country) on TikTok with a proxy",
    description: "Set up a spare iPhone with an ISP proxy to post TikTok content in any country",
    type: "markdown",
    markdownContent: `You need a **spare iPhone**. Android phones are significantly harder to get through TikTok's detection, so stick with iOS.

Here's the exact setup I followed.

---

## Step by step

**1. Buy a US ISP proxy on [iProyal](https://iproyal.com)** (~$7). Pick a residential ISP, I used Spartanburg, SC. The key is that the proxy must come from a real ISP (not a data center), otherwise TikTok flags it immediately.

**2. Factory reset a spare iPhone.** Settings > General > Transfer or Reset iPhone > Erase All Content and Settings. Remove any SIM card from the phone. TikTok uses carrier info to detect your real country.

**3. Set timezone + region to US.** During setup, set the device region to United States and timezone to Eastern or Pacific.

**4. Create a fresh iCloud account from the phone.** Don't sign in with your existing one. Apple ties location history to your iCloud account. During setup, Apple may ask for a phone number. Use an app like [Text+](https://apps.apple.com/app/text-free-texting-calling/id338088432) to get a cheap US phone number.

**5. Set a US shipping address.** You can generate a realistic US address on [FakeXY](https://www.fakexy.com/).

**6. Buy Shadowrocket with a prepaid US iTunes gift card.** [MTC Games](https://www.mtcgame.com/fr/itunes/gift-card-us/itunes-gift-card-us-3?currency=EUR) sells US iTunes cards. Shadowrocket costs ~$3 but taxes aren't included, so get a $4 card to be safe. Redeem it in the App Store and download [Shadowrocket](https://apps.apple.com/app/shadowrocket/id932747118).

**7. Add your proxy to Shadowrocket.** Configure the iProyal proxy in Shadowrocket and connect.

**8. Verify your setup on [Whoer.net](https://whoer.net)** before opening any social app:
- **OS:** must be detected as "iOS (iPhone)"
- **Anonymity:** must reach 90-100% with no proxy or masking system detected

If either check fails, fix your proxy configuration before proceeding.

**9. Download TikTok and sign up with Apple.** Since your iCloud account is US-based, Sign in with Apple goes through cleanly.

**10. Warm up the account** for 2-3 days before posting. See the tutorial below.`,
    order: 3,
  },
  {
    category: "launch-and-grow",
    title: "Warm up a fresh TikTok account",
    description: "Build trust with the algorithm before posting content",
    type: "markdown",
    markdownContent: `TikTok profiles your account before showing your content to anyone. Skip warmup and the algorithm has no data on you. Your posts get tested in the wrong bucket and the account never recovers.

---

## Phase 0: lurk (Days 1-2)

Scroll 3-4 times a day, 10-15 min each. No posting, no commenting, no profile edits. Watch niche content fully, skip irrelevant stuff quickly. Follow 5-10 accounts per day max, spread across sessions.

Watch time is the strongest signal. Complete videos, rewatch some, let them loop. This matters more than likes.

If your FYP isn't showing target-country niche content by Day 2, reset the account.

---

## Phase 1: train the algorithm (Days 3-5)

Still no posting. 2-3 scroll sessions per day. Start using search: search niche keywords, click results, watch top videos fully. Stay in your niche.

Add 1-2 short, neutral comments per session ("this makes sense," "never thought about it this way"). No emoji spam, no hot takes.

Move on when your FYP is ~70% niche-aligned with creators from your target country.

---

## Phase 2: first posts (Days 5-7)

Add a neutral profile picture and a simple bio (no links, no selling). Post 2-3 image slideshows. Low risk, good watch time.

**The 700-view test:** wait 24-48h. 700+ views = healthy. Under 300 on 3+ posts = account is likely compromised, consider starting fresh.

---

## Ongoing rules

- 1-2 posts/day, natively through the app (no third-party schedulers)
- Post during peak hours (7-9 AM, 11 AM-1 PM, 6-9 PM ET for US)
- Don't add links or CTAs until you have consistent traction
- When a format stops working (6+ posts under baseline), switch to something new
- If views drop: stop posting that format, wait 48h, test something different
- Pausing preserves account health. Pushing harder when things aren't working makes it worse`,
    order: 4,
  },
  {
    category: "launch-and-grow",
    title: "What to post on TikTok",
    description: "Turn your warmup research into content that gets views",
    type: "markdown",
    markdownContent: `Warmup isn't just about building trust with the algorithm. It's your market research phase. Use it.

---

## Warmup = market research

While you're lurking (Phase 0-1 of warmup), actively take notes:

- **Save sounds and music** used in your niche. You'll reuse these later.
- **Note the formats**: carousels, faceless videos, talking head, text overlay, screen recordings. What do creators in your niche actually post?
- **Write down hooks** that grab your attention. The first 1-2 seconds decide everything on TikTok.

Don't just scroll passively. You're studying what works.

---

## Find reproducible formats

The goal isn't to find what's "cool." It's to spot trending formats **you can easily reproduce**.

No face? Carousels? Text overlay videos with trending audio? Identify what's getting views in your niche and what you can actually make with minimal effort.

If a format requires expensive gear, editing skills you don't have, or showing your face when you don't want to: skip it. There are always simpler formats that work.

---

## Start with variants

Once your research is done, **create variants of what you've seen**. Don't reinvent. Reproduce and iterate.

Take a viral video in your niche, study the structure (hook → content → CTA), and make your own version with your app's angle. Same format, different content.

---

## The <500 view rule

If a format consistently gets under 500 views after 3-4 posts, **drop it**. It's a bad format for your account.

Don't keep pushing a format that isn't working. The algorithm has already decided it doesn't resonate with your audience. Move on.

---

## Double down on what works

When something hits (1k+ views, good engagement), **analyze why**:

- Was it the hook?
- The music/sound?
- The format itself?
- The topic?

Then create more variants of that winner. Claude can help you brainstorm and generate variants of a format that's performing well.

---

## The cycle

This is the process, on repeat:

1. **Research**: study what's working in your niche
2. **Reproduce**: create your version of proven formats
3. **Test**: post 3-4 videos in that format
4. **Analyze**: check views and engagement after 48h
5. **Variant or pivot**: if it works, make more variants. If not, try a different format
6. **Repeat**

The creators who grow aren't more creative. They just test more formats and double down faster on what works.`,
    order: 5,
  },
  {
    category: "launch-and-grow",
    title: "What to post on Instagram",
    description: "Adapt your content strategy for Instagram Reels and carousels",
    type: "markdown",
    markdownContent: `What works on TikTok doesn't automatically work on Instagram. Different algorithm, different audience behavior, different content culture. You need to do the research again from scratch.

---

## Warm up on Instagram too

Just like TikTok, you need a warmup phase on Instagram. New accounts that start posting immediately get buried.

Spend 3-5 days scrolling Reels in your niche, engaging with content, following relevant accounts. Train the algorithm to understand what your account is about before you post anything.

The process is the same: lurk, engage lightly, build a profile the algorithm can categorize.

---

## Do your market research separately

Don't assume your TikTok research carries over. The formats, hooks, and styles that perform on TikTok can completely flop on Instagram (and vice versa).

During your warmup, study Instagram specifically:

- What Reel formats get views in your niche?
- What carousel styles get saves and shares?
- How long are the top-performing Reels? (often shorter than TikTok)
- What hooks work here vs TikTok?

Take notes separately from your TikTok research. Treat it as a different platform because it is.

---

## Music matters more on Instagram

On TikTok, trending sounds come and go fast. On Instagram, **music choice is a bigger ranking factor**. The algorithm actively pushes Reels that use trending audio.

Here's how to find the right sounds:

1. **Go to the Reels "Trends" section** in the Instagram app (when creating a Reel, browse trending audio)
2. **Look for sounds with less than 20k posts**. These are trending but not oversaturated. Once a sound has 100k+ posts, you're competing with everyone
3. **During warmup, pay attention to the music**. When you watch Reels in your niche, tap on the audio name. You'll see how many posts use it and whether it's trending up

The sweet spot is a sound that's clearly gaining traction but hasn't blown up yet. Use it before everyone else does.

---

## Same cycle, different platform

The process is identical to TikTok:

1. **Research**: study what's working on Instagram specifically
2. **Reproduce**: create your version of proven formats
3. **Test**: post 3-4 Reels or carousels in that format
4. **Analyze**: check reach and engagement after 48h
5. **Variant or pivot**: double down on winners, drop what doesn't work
6. **Repeat**

Don't cross-post TikTok content to Instagram with a watermark. Instagram deprioritizes recycled TikTok videos. If you want to reuse a concept, re-record it natively or at least remove the watermark.`,
    order: 6,
  },

  {
    category: "launch-and-grow",
    title: "A/B test your paywall with RevenueCat Experiments",
    description: "Set up experiments to test pricing, trials, and paywall design without shipping a new build",
    type: "markdown",
    markdownContent: `![RevenueCat experiment results for Glow](/screenshots/revenuecat-experiment-glow.png)

*The first experiment I ran on Glow. The initial conversion rate wasn't crazy, but variant B converted nearly 2x more.*

Most developers pick a price, set a trial length, and never touch it again. You should be testing this stuff constantly. RevenueCat Experiments lets you A/B test your paywall without shipping a new build.

---

## How it works

RevenueCat splits new users into groups and shows each group a different Offering. An Offering is a set of products (monthly, yearly, trial, etc.) tied to a paywall. You already have one if you're using RevenueCat.

The split is server-side. Your app fetches the current Offering for each user, RevenueCat handles the assignment. No app update required. The only condition: your paywall needs to be dynamic, meaning it displays whatever Offering RevenueCat returns instead of hardcoded product IDs.

---

## What you can test

- **Trial length**: 3-day vs 7-day vs no trial
- **Price points**: $4.99/mo vs $9.99/mo
- **Subscription duration**: monthly vs yearly vs both
- **Product ordering**: which plan shows first on the paywall
- **Paywall design**: completely different layouts (requires RevenueCat Paywalls)

Test one variable at a time. If you change the price and the trial length in the same test, you won't know what caused the difference.

---

## Setup

**1. Create your Offerings.** In the RevenueCat dashboard, go to Offerings and create one for each variant you want to test. Testing $4.99/mo vs $9.99/mo means two Offerings, each pointing to the right product.

**2. Check that your paywall is dynamic.** Your app should display whatever Offering RevenueCat returns for the current user. If you hardcoded product IDs in your paywall, go fix that first.

**3. Create the experiment.** Go to Experiments in the dashboard. Pick your control (current Offering) and your variant. Set the traffic split. 50/50 is standard. Use 80/20 if you want to limit risk.

**4. Start it.** RevenueCat begins enrolling new users immediately. Existing users are not enrolled. Only new users who haven't seen a paywall yet.

---

## Reading results

RevenueCat tracks per variant:

- **Conversion rate**: % of users who started a subscription
- **Trial conversion rate**: % of trial users who converted to paid
- **Revenue per user**: total revenue divided by users in that group
- **MRR impact**: projected monthly recurring revenue difference

Revenue per user is the one that matters. A lower price might convert more users but generate less total revenue. A higher price converts fewer but brings in more money. Focus on revenue, not conversion rate alone.

Wait for statistical significance before deciding. RevenueCat shows confidence levels. Below 95%, the difference could be noise.

---

## Where to start

If you've never tested your paywall:

1. **Trial vs no trial.** Highest-impact test you can run. Some apps see 2-3x more conversions with a trial. Others get tons of trial starts but terrible paid conversion. You need to know which camp you're in.

2. **Price anchoring.** Show a yearly plan next to a monthly plan. The yearly looks cheap by comparison. Test whether showing both increases yearly subscriptions.

3. **7-day vs 3-day trial.** Shorter trials create urgency. Longer trials build habit. The right answer depends entirely on your app.

---

## Tips

- Run tests for at least 2 weeks, or until you hit 95% confidence. Whichever comes last.
- Bigger price gaps validate faster. $3 vs $10 gives you a clear answer much sooner than $4.99 vs $5.99.
- One experiment at a time per audience. Running multiple tests on the same users pollutes results.
- When you find a winner, test it against a new variant. Keep going.
- Experiments requires a RevenueCat Pro or Enterprise plan.`,
    order: 7,
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
