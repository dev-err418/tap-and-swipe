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
    youtubeUrl: null,
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
    youtubeUrl: null,
    order: 1,
  },
  {
    category: "design",
    title: "Design an onboarding that converts",
    description: "Build an onboarding flow that turns new users into paying customers",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=sHzbhQaHIOw",
    order: 2,
  },
  {
    category: "design",
    title: "Your first App Store screenshot is everything",
    description: "Design screenshots that stop the scroll and convert",
    type: "video",
    youtubeUrl: null,
    markdownContent: `Figma template for screenshots: [App Store Screenshots Template](https://www.figma.com/community/file/1165594034578098226)`,
    order: 3,
  },

  // Build
  {
    category: "build",
    title: "From zero to running app with Expo + AI tools",
    description: "Set up your dev environment and build your first screen",
    type: "video",
    youtubeUrl: null,
    order: 1,
  },
  {
    category: "build",
    title: "App Store Connect setup",
    description: "Configure your app in App Store Connect before submitting",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=vK2sJO6TrUk",
    order: 2,
  },
  {
    category: "build",
    title: "Submitting your first build to TestFlight",
    description: "Get your app on a real device through TestFlight",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=qMoPSXUm6LQ",
    order: 3,
  },
  {
    category: "build",
    title: "Set up Sentry, PostHog & Supabase",
    description: "Add crash monitoring, analytics, and a backend in one go",
    type: "markdown",
    markdownContent: `Your app is taking shape. Before you ship, set up these three tools. They're all free, no credit card needed, and they'll save you when things go wrong (and they will).

---

## Sentry (crash monitoring)

Tracks every crash and error in your app. You'll see exactly what broke, on which device, and why. Without this, users just silently delete your app and you never know what happened.

Set it up early. Don't wait until you have users, you want to catch bugs during development too.

Go to [sentry.io](https://sentry.io) and create a free account (huge free tier).

A user in Brazil crashes on a screen you never tested. Without Sentry, you'd never know. With Sentry, you see it instantly and fix it before more users hit the same bug.

---

## PostHog (analytics & AB testing)

Two things in one tool.

**Analytics:** see what users actually do in your app. Which screens they visit, where they drop off, how long they stay. You stop guessing and start knowing.

**AB testing:** test different versions of your paywall, onboarding, features, anything. Show version A to half your users and version B to the other half. See which one converts better. We'll go deep on this in the AB testing video.

Go to [posthog.com](https://posthog.com) and create a free account (huge free tier, 1M events/month).

**What to track from day one:**

- \`app_opened\` for basic usage
- \`onboarding_completed\` to see if users finish onboarding
- \`paywall_viewed\` to see if users are seeing your paywall
- \`trial_started\` to track trial starts
- \`subscription_activated\` to track paying users

This gives you a funnel. You'll see exactly where users drop off.

---

## Supabase (database & auth, only if you need it)

Gives you a database and user authentication. If your app needs to store data in the cloud or have user accounts, use Supabase.

Not every app needs this. A simple widget app or offline tracker might not need any backend. If your app works entirely on-device, skip this.

**You need Supabase if:**

- Users create accounts or log in
- Data syncs across devices
- You need to store data server-side
- Your app has any social or shared features

Go to [supabase.com](https://supabase.com) and create a free account (big free tier, 2 projects). Gives you a Postgres database, authentication, file storage, and real-time subscriptions out of the box.

If you're not sure whether you need it, you probably don't yet. Skip it and come back when you need cloud features.

---

## Quick summary

| Tool | Purpose | Free tier | Credit card |
|------|---------|-----------|-------------|
| Sentry | Crash monitoring | Huge | No |
| PostHog | Analytics + AB testing | 1M events/mo | No |
| Supabase | Database + auth | 2 projects | No |

Set up Sentry and PostHog now. Add Supabase only if your app needs it. All free, all essential.`,
    order: 4,
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
    youtubeUrl: null,
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
2. Enter your base US subscription prices
3. Review the PPP-adjusted suggestions
4. Go to App Store Connect > your app > Subscriptions > Pricing
5. Manually set each country's price to match PriceLocalize's recommendations
6. Save and submit

$5/week feels different than 40kr/week. Price for the market, not just for the US. It's one of the easiest wins you'll ever get.`,
    order: 4,
  },

  // Launch & Grow
  {
    category: "launch-and-grow",
    title: "ASO after launch",
    description: "Optimize your listing based on real data",
    type: "video",
    youtubeUrl: null,
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

- Mac setup (beginner friendly): [Notion guide](https://capable-oak-5a9.notion.site/Set-up-your-own-Tiktok-VPN-on-Mac-For-beginners-3006f6d8ab3d802b9dd0f4bba07e1a2e)
- DigitalOcean setup (more advanced): [Notion guide](https://separate-quart-3d6.notion.site/TikTok-USA-VPN-via-DigitalOcean-306806fd6a11801c94bbf8bb454f2083)

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

Remove your SIM card (or use a device without one). TikTok uses carrier info to detect your real country.

Set your device region to match your target country (Settings > General > Language & Region).

Set your timezone to match your target location. If targeting US, use Eastern Time or Pacific Time. TikTok weighs posting timing and engagement timing against your timezone.

Set language to English (or your target country's language).

Connect your proxy/VPN and verify ASN + GEO are correct using the tools above.

Only then download TikTok. The app must be installed while your connection is already clean.

---

## Creating your account

Install TikTok fresh. If previously installed, delete completely and reinstall.

Verify the country code when the phone number field appears. It must match your target region. This is a dead giveaway if it's wrong.

Sign up with email, not phone number. Phone numbers are tied to your real country and harder to match with your target GEO. If you're on iPhone, "Sign in with Apple" is even better (higher trust, device-verified identity).

Check your For You Page. It should show content from your target region in the right language. If you see content from your real country, something is wrong. Start over.

Don't touch your profile yet. No bio, no picture, no username changes. We'll do that during warmup.

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

  {
    category: "launch-and-grow",
    title: "Warm up a fresh TikTok account",
    description: "Build trust with the algorithm before posting content",
    type: "markdown",
    markdownContent: `TikTok tracks new accounts hard. If you start posting, liking, and following on day one, you'll get flagged as a bot and shadowbanned. Your videos will get zero views and you won't even know why.

The fix: act like a real human for a week. Here's the exact day-by-day plan.

---

## Day 1: watch only

- **NO** follows, likes, or comments
- **Don't touch your profile** yet, no bio, no picture
- Just **search your niche** and watch content
- The algorithm learns what you're into based on your searches
- Spend 15-20 minutes browsing naturally

TikTok is watching how a brand new account behaves. Real users browse before they engage. Bots start spamming immediately. Don't be a bot.

---

## Day 2: still watching

- Keep searching and watching content in your niche
- **Now you can set your profile picture and bio**
- Still **no engagement**, no likes, no follows, no comments
- Watch videos fully, don't skip around

You're building a browsing history. TikTok is getting more confident you're a real user interested in a specific niche.

---

## Day 3: light engagement

- **Like and follow 5 accounts** in your niche
- Keep watching content naturally
- Watch videos all the way through
- You can start saving videos you like

---

## Day 4: a bit more

- **Like and follow 10 more accounts** in your niche
- Continue watching full videos
- You can start leaving short, genuine comments (nothing spammy)

---

## Day 5: first post

- **Follow 10 more niche accounts**
- **Drop your first video**
- **NO promotion in this video**, no "download my app" or links
- Reaction content with strong hooks performs best for first posts
- Keep engaging with other accounts naturally

---

## Day 6: keep going

- Post again if you have content ready
- Engage naturally with likes, comments, follows
- Still no hard promotion yet
- Watch how your first video performed

---

## Day 7+: you're warmed up

After day 6, your account is warmed up. Now you can:

- Post consistently (1-2 times per day is ideal)
- Engage naturally with your community
- Start introducing your app in content (soft sells first)
- Use trending sounds and hooks in your niche

---

## The rules (don't break these)

- **Never follow/unfollow in bulk.** TikTok flags mass actions instantly.
- **Never use bots or automation tools.** Instant shadowban.
- **Always watch videos fully.** Skipping around signals bot behavior.
- **Keep your VPN on** if you're targeting a different country.
- **Don't post and ghost.** After posting, stay on the app for 15-20 min engaging with content. TikTok rewards active users.
- **Be patient.** 6 days of warmup saves you from months of shadowban recovery.

---

## Quick reference

| Day | Actions | Post? |
|-----|---------|-------|
| 1 | Search + watch only. No profile setup. | No |
| 2 | Search + watch. Set profile pic + bio. | No |
| 3 | Like/follow 5 niche accounts. | No |
| 4 | Like/follow 10 more. Light comments. | No |
| 5 | Follow 10 more. First video (no promo). | Yes |
| 6 | Post again. Engage naturally. | Yes |
| 7+ | Warmed up. Post consistently. | Yes |

That's it. One week of patience = an account that actually reaches people. Skip this and you'll wonder why nobody sees your videos.`,
    order: 4,
  },
];

async function main() {
  console.log("Cleaning up old seed data...");

  await prisma.lessonProgress.deleteMany({
    where: { lessonId: { startsWith: "seed-" } },
  });
  await prisma.lesson.deleteMany({
    where: { id: { startsWith: "seed-" } },
  });

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
      },
      create: {
        id: `seed-${lesson.category}-${lesson.order}`,
        category: lesson.category,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        youtubeUrl: lesson.youtubeUrl ?? null,
        markdownContent: lesson.markdownContent ?? null,
        order: lesson.order,
      },
    });
  }

  console.log(`Seeded ${lessons.length} lessons.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
