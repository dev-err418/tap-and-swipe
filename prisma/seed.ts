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
  youtubeUrl?: string;
  markdownContent?: string;
  order: number;
}

const lessons: Lesson[] = [
  // Getting Started
  {
    category: "getting-started",
    title: "Welcome to the roadmap",
    description: "What you'll learn and how the course works",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder-welcome",
    order: 1,
  },
  {
    category: "getting-started",
    title: "Tools & setup",
    description: "Everything you need before you start building",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder-tools",
    order: 2,
  },

  // Find Your Idea
  {
    category: "find-your-idea",
    title: "How to find app ideas that actually make money",
    description: "Identify app ideas with real demand and revenue potential",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder1",
    order: 1,
  },
  {
    category: "find-your-idea",
    title: "ASO basics: pick keywords that get you discovered",
    description: "Use keyword research to validate demand before building",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder2",
    order: 2,
  },
  {
    category: "find-your-idea",
    title: "How to structure your app name & subtitle",
    description: "Craft a name and subtitle that rank and convert",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder3",
    order: 3,
  },
  {
    category: "find-your-idea",
    title: "The 3-day validation test",
    description: "Validate your idea in 3 days before writing any code",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder4",
    order: 4,
  },

  // Design
  {
    category: "design",
    title: "Design your app without being a designer",
    description: "Use AI and reference apps to create pro-level designs",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder5",
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
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder6",
    order: 3,
  },

  // Build
  {
    category: "build",
    title: "From zero to running app with Expo + AI tools",
    description: "Set up your dev environment and build your first screen",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder7",
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

## Sentry — crash monitoring

Tracks every crash and error in your app. You'll see exactly what broke, on which device, and why. Without this, users just silently delete your app and you never know what happened.

Set it up early. Don't wait until you have users — you want to catch bugs during development too.

Go to [sentry.io](https://sentry.io) and create a free account (huge free tier).

A user in Brazil crashes on a screen you never tested. Without Sentry, you'd never know. With Sentry, you see it instantly and fix it before more users hit the same bug.

---

## PostHog — analytics & AB testing

Two things in one tool.

**Analytics** — see what users actually do in your app. Which screens they visit, where they drop off, how long they stay. You stop guessing and start knowing.

**AB testing** — test different versions of your paywall, onboarding, features — anything. Show version A to half your users and version B to the other half. See which one converts better. We'll go deep on this in the AB testing video.

Go to [posthog.com](https://posthog.com) and create a free account (huge free tier — 1M events/month).

**What to track from day one:**

- \`app_opened\` — basic usage
- \`onboarding_completed\` — are users finishing onboarding?
- \`paywall_viewed\` — are users seeing your paywall?
- \`trial_started\` — are users starting trials?
- \`subscription_activated\` — are users paying?

This gives you a funnel. You'll see exactly where users drop off.

---

## Supabase — database & auth (only if you need it)

Gives you a database and user authentication. If your app needs to store data in the cloud or have user accounts, use Supabase.

Not every app needs this. A simple widget app or offline tracker might not need any backend. If your app works entirely on-device, skip this.

**You need Supabase if:**

- Users create accounts or log in
- Data syncs across devices
- You need to store data server-side
- Your app has any social or shared features

Go to [supabase.com](https://supabase.com) and create a free account (big free tier — 2 projects). Gives you a Postgres database, authentication, file storage, and real-time subscriptions out of the box.

If you're not sure whether you need it — you probably don't yet. Skip it and come back when you need cloud features.

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
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder8",
    order: 1,
  },
  {
    category: "monetize",
    title: "Paywall strategy: the 3-step onboarding that converts",
    description: "Design an onboarding flow that leads to purchases",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder9",
    order: 2,
  },
  {
    category: "monetize",
    title: "AB test everything",
    description: "Run experiments on pricing, copy, and layout",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder10",
    order: 3,
  },
  {
    category: "monetize",
    title: "Price smarter: localized pricing with PriceLocalize",
    description: "Maximize revenue by adapting prices per region",
    type: "markdown",
    markdownContent: `Most indie developers set one price worldwide and leave money on the table. Localized pricing can increase revenue 30-50% without changing anything else.

## Why localize pricing?

$9.99/month is nothing in the US but expensive in Brazil or India. If you charge the same everywhere:

- You lose users in lower-income markets who would have paid a lower price
- You miss out on volume that drives App Store rankings

## How PriceLocalize works

[PriceLocalize](https://pricelocalize.com) analyzes purchasing power and competitor pricing per country, then recommends optimal price tiers.

### Setup
1. Connect your RevenueCat account
2. Select which products to optimize
3. Review the recommended price tiers per region
4. Apply the pricing to your App Store Connect / Google Play Console

## Recommended pricing tiers

| Region | Multiplier | Example |
|--------|-----------|---------|
| US, UK, Australia | 1.0x | $9.99/mo |
| Western Europe | 0.8x | $7.99/mo |
| Eastern Europe | 0.5x | $4.99/mo |
| Latin America, SE Asia | 0.3x | $2.99/mo |
| India, Africa | 0.1x | $0.99/mo |

## Key rules

1. **Always use local currency** — users convert better when they see their own currency
2. **Use charm pricing** — $9.99 beats $10.00 everywhere
3. **Test in batches** — roll out to 2-3 countries at a time and measure
4. **Check competitors** — see what top apps charge in each market

> **Pro tip:** Start with just US pricing, then add 5 key markets (UK, Germany, Brazil, India, Japan) once you have baseline conversion data.`,
    order: 4,
  },

  // Launch & Grow
  {
    category: "launch-and-grow",
    title: "ASO after launch",
    description: "Optimize your listing based on real data",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder11",
    order: 1,
  },
  {
    category: "launch-and-grow",
    title: "Apple Ads: your first campaign setup",
    description: "Set up Apple Search Ads to drive targeted installs",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder12",
    order: 2,
  },
  {
    category: "launch-and-grow",
    title: "Target any country on TikTok with a VPN",
    description: "Reach international audiences by geo-targeting your TikTok content",
    type: "markdown",
    markdownContent: `TikTok shows your content primarily to users in your own country. But if your app is global, you want to reach users everywhere. Here's how to use a VPN to post content that targets specific countries.

## Why this matters

TikTok's algorithm distributes your videos based on where it thinks you are. If you're in the US, your content goes to US users first. But some markets are way less competitive — your video might blow up in Germany or Brazil where fewer creators are posting about apps.

## Step-by-step

### 1. Get a VPN with the right locations
Use a VPN that has servers in your target countries. Good options:
- NordVPN
- Surfshark
- ExpressVPN

### 2. Create a fresh TikTok account per region
- Connect to the target country's VPN server
- Create a new TikTok account (use a new email)
- Set the language to that country's language
- Fill out the profile completely

### 3. Warm up the account (see next lesson)

### 4. Post localized content
- Use captions and hashtags in the local language
- Reference local trends or pain points
- Post during that country's peak hours

## Best countries to target for app promotion

| Country | Why |
|---------|-----|
| US | Highest ad revenue, biggest market |
| UK | English-speaking, high purchasing power |
| Germany | Largest EU market, less competition |
| Brazil | Huge TikTok user base, growing app market |
| Japan | High app spending per user |

## Tips
- Keep your VPN on while browsing TikTok too — this trains the algorithm
- Engage with local creators' content before posting your own
- One account per country, don't switch VPN locations on the same account`,
    order: 3,
  },
  {
    category: "launch-and-grow",
    title: "Warm up a fresh TikTok account",
    description: "Build trust with the algorithm before posting content",
    type: "markdown",
    markdownContent: `A brand new TikTok account that starts posting immediately gets very low reach. You need to "warm up" the account so TikTok's algorithm trusts it and distributes your content.

## Why warm up?

TikTok flags new accounts that immediately start posting as potential spam or bots. Warming up signals that you're a real user, which means better distribution when you do start posting.

## The 7-day warm-up schedule

### Days 1-2: Just browse
- Scroll through the For You Page for 15-20 minutes
- Like 10-15 videos in your niche (app development, productivity, tech)
- Follow 5-10 creators in your space
- Do NOT post anything

### Days 3-4: Start engaging
- Watch videos fully (don't skip)
- Leave genuine comments on 5-10 videos
- Share 2-3 videos
- Follow a few more creators
- Still no posting

### Days 5-6: Light activity
- Continue browsing and engaging
- Search for hashtags you plan to use
- Save videos for inspiration
- Optional: go live for a few minutes (even just to test)

### Day 7: First post
- Post your first video
- Keep it simple — introduce yourself or your app
- Use 3-5 relevant hashtags
- Post during peak hours for your target audience

## Key rules

1. **Don't rush it** — 7 days of warming up saves weeks of low reach
2. **Be consistent** — log in every day during warm-up
3. **Stay in your niche** — only engage with content related to your topic
4. **One account per device/VPN** — don't switch between accounts constantly
5. **Complete your profile first** — bio, profile picture, and username before you start

## After warm-up

Once your account is warmed up, aim to post 1-2 times per day for the first 2 weeks. Consistency matters more than quality at this stage — the algorithm rewards accounts that post regularly.

> **Pro tip:** Your first 5 videos won't perform well and that's normal. The algorithm is still learning who to show your content to. Keep posting.`,
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
