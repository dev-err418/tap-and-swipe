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
    order: 2,
  },

  // Find Your Idea
  {
    category: "find-your-idea",
    title: "How to find app ideas that actually make money",
    description: "Identify app ideas with real demand and revenue potential",
    type: "video",
    youtubeUrl: "https://youtu.be/QkPxS-2tzXk",
    order: 1,
  },
  {
    category: "find-your-idea",
    title: "ASO basics: pick keywords that get you discovered",
    description: "Use keyword research to validate demand before building",
    type: "video",
    youtubeUrl: "https://youtu.be/xqvQHfgc5fg",
    order: 2,
  },
  {
    category: "find-your-idea",
    title: "How to structure your app name & subtitle",
    description: "Craft a name and subtitle that rank and convert",
    type: "video",
    youtubeUrl: null,
    order: 3,
  },
  {
    category: "find-your-idea",
    title: "The 3-day validation test",
    description: "Validate your idea in 3 days before writing any code",
    type: "video",
    youtubeUrl: null,
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
    markdownContent: `TikTok shows your content to users in your region. If you're in France and want to reach the US market, you need a VPN. Here's how to set it up properly so TikTok actually thinks you're in your target country.

I have two detailed Notion guides for setting up your own VPN:

- **Hostinger setup:** [Notion guide](https://capable-oak-5a9.notion.site/Set-up-your-own-Tiktok-VPN-on-Mac-For-beginners-3006f6d8ab3d802b9dd0f4bba07e1a2e)
- **DigitalOcean setup:** [Notion guide](https://separate-quart-3d6.notion.site/TikTok-USA-VPN-via-DigitalOcean-306806fd6a11801c94bbf8bb454f2083)

Both are more advanced setups but give you full control over your VPN. Below is the summary of what you need to know.

---

## Before downloading TikTok

This is critical. Do these steps BEFORE you install TikTok. If you install first and then set up the VPN, TikTok already knows your real location. Start clean.

I use a spare iPhone that I factory reset. Create a brand new iCloud account, set the region to your target country, and install TikTok fresh on it. This way everything is clean from the start.

1. **Use a device without a SIM card** or take the SIM out. TikTok uses your carrier info to detect your country.
2. **Activate your VPN connection** and connect to a server in your target country (e.g., US).
3. **Change your device's location settings** to match your target country.
4. **Set your device's time zone** to match your target location (e.g., EST for US East Coast).

Everything on the device should scream "I'm in the US" (or whatever country you're targeting).

---

## Creating your account

1. **Install TikTok from scratch.** If it was previously installed, delete it completely and reinstall.
2. **When the phone number field appears,** verify the country code matches your target region. This is a dead giveaway if it's wrong.
3. **Sign up with an email address.** Do NOT use a phone number, phone numbers are tied to your real country.
4. **Check your For You Page.** It should display content from your target region. If you see content from your real country, something went wrong, start over.

---

## Quick checklist

Before you create the account, verify ALL of these:

- [ ] SIM card removed or no SIM device
- [ ] VPN connected to target country
- [ ] Device region set to target country
- [ ] Device timezone set to target location
- [ ] TikTok freshly installed (not carried over)
- [ ] Signing up with email, not phone number
- [ ] Country code on phone field matches target

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
