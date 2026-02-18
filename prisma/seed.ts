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
    title: "Welcome to App Sprint",
    description: "What you'll learn and how the course works",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder-welcome",
    order: 1,
  },
  {
    category: "getting-started",
    title: "Tools & Accounts Setup",
    description: "Everything you need before you start",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder-tools",
    order: 2,
  },

  // Find Your Idea
  {
    category: "find-your-idea",
    title: "Finding Profitable App Ideas",
    description: "How to identify app ideas with real demand",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder1",
    order: 1,
  },
  {
    category: "find-your-idea",
    title: "Keyword Research with Astro",
    description: "Use Astro to find high-traffic keywords",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder2",
    order: 2,
  },
  {
    category: "find-your-idea",
    title: "Competitor Revenue Analysis",
    description: "Check if competitors are making money",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder3",
    order: 3,
  },

  // Design
  {
    category: "design",
    title: "Designing in Figma with AI",
    description: "Speed up your design workflow with AI tools",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder4",
    order: 1,
  },
  {
    category: "design",
    title: "Studying Top Apps on Mobbin",
    description: "Learn from the best UI patterns",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder5",
    order: 2,
  },
  {
    category: "design",
    title: "Design Principles for Mobile",
    description: "Key principles that make apps feel premium",
    type: "markdown",
    markdownContent: `# Design Principles for Mobile

Great design is what separates apps that convert from apps that get deleted.

## The 3-second rule

Users decide whether to keep your app within 3 seconds. Your first screen must:

- Clearly communicate what the app does
- Look polished and professional
- Have an obvious call-to-action

## Key principles

### 1. Hierarchy
Guide the user's eye. Use size, color, and spacing to create a clear visual hierarchy.

### 2. Consistency
Use the same colors, fonts, and spacing throughout. Inconsistency = unprofessional.

### 3. White space
Don't cram everything together. Breathing room makes your app feel premium.

### 4. Thumb-friendly
Keep primary actions within thumb reach (bottom half of screen). Navigation should be effortless.

## Color psychology

| Color | Feeling | Best for |
|-------|---------|----------|
| Blue | Trust | Finance, health |
| Green | Growth | Fitness, money |
| Orange | Energy | Social, gaming |
| Purple | Premium | Luxury, creative |

## Resources

- [Mobbin](https://mobbin.com) — browse top app designs
- [Figma Community](https://figma.com/community) — free templates
- [Apple HIG](https://developer.apple.com/design/) — official guidelines`,
    order: 3,
  },

  // Build
  {
    category: "build",
    title: "Setting Up Expo & React Native",
    description: "Get your dev environment ready",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder7",
    order: 1,
  },
  {
    category: "build",
    title: "Building with AI Coding Tools",
    description: "Use Claude and Cursor to move 10x faster",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder8",
    order: 2,
  },
  {
    category: "build",
    title: "Crash Monitoring with Sentry",
    description: "Set up error tracking from day one",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder9",
    order: 3,
  },
  {
    category: "build",
    title: "Analytics & Backend Setup",
    description: "PostHog analytics and Supabase backend",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder10",
    order: 4,
  },

  // Monetize
  {
    category: "monetize",
    title: "RevenueCat & Superwall Setup",
    description: "Set up your paywall infrastructure",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder11",
    order: 1,
  },
  {
    category: "monetize",
    title: "Pricing Strategy Guide",
    description: "How to price your app for maximum revenue",
    type: "markdown",
    markdownContent: `# Pricing Strategy Guide

Getting your pricing right can 2-3x your revenue without changing anything else.

## Pricing models

### Free trial + subscription
Best for most apps. Give users 3-7 days to experience value, then charge.

### Freemium
Free basic features, paid premium. Works well for utility apps.

### One-time purchase
Simple, but harder to build a business on. Consider for simple tools.

## Localized pricing

**This is the #1 overlooked revenue lever.** Price differently per region:

- **US/UK/AU**: Full price ($9.99/mo)
- **Europe**: Slightly lower ($7.99/mo)
- **Latin America/SE Asia**: Much lower ($2.99/mo)
- **India**: Lowest ($0.99/mo)

RevenueCat makes this easy with price experiments.

## A/B testing your paywall

Always test:
1. **Price points** — try 3 different prices
2. **Trial length** — 3 days vs 7 days
3. **Layout** — feature list vs social proof
4. **CTA copy** — "Start Free Trial" vs "Try Free for 7 Days"

> **Rule of thumb:** Your first paywall will convert at ~2%. After optimization, aim for 5-8%.`,
    order: 2,
  },
  {
    category: "monetize",
    title: "A/B Testing Paywalls",
    description: "Optimize for maximum conversion",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder13",
    order: 3,
  },

  // Launch & Grow
  {
    category: "launch-and-grow",
    title: "ASO Keyword Optimization",
    description: "Rank higher in the App Store",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder14",
    order: 1,
  },
  {
    category: "launch-and-grow",
    title: "Launch Checklist",
    description: "Everything you need before hitting publish",
    type: "markdown",
    markdownContent: `# Launch Checklist

Use this checklist before submitting your app to the App Store.

## App Store listing
- [ ] App name includes primary keyword
- [ ] Subtitle uses secondary keywords
- [ ] Description is compelling and keyword-rich
- [ ] Screenshots show key features with captions
- [ ] App preview video (optional but recommended)
- [ ] Privacy policy URL is set
- [ ] Support URL is set

## Technical
- [ ] Crash-free rate > 99%
- [ ] App loads in under 2 seconds
- [ ] All analytics events are firing
- [ ] RevenueCat products are configured
- [ ] Paywall displays correctly
- [ ] Push notification permissions work
- [ ] Deep links work (if applicable)

## Marketing
- [ ] Landing page is live
- [ ] Social media accounts created
- [ ] Launch day post scheduled
- [ ] Apple Search Ads campaign ready
- [ ] First week of content planned

## Post-launch (week 1)
- [ ] Monitor crash reports daily
- [ ] Respond to all reviews
- [ ] Track conversion funnel
- [ ] Start A/B testing paywall
- [ ] Analyze keyword rankings

> **Pro tip:** Submit to App Review 2-3 days before your planned launch date. Reviews can take 24-48 hours.`,
    order: 2,
  },
  {
    category: "launch-and-grow",
    title: "TikTok & Social Marketing",
    description: "Viral reach with social media marketing",
    type: "video",
    youtubeUrl: "https://www.youtube.com/watch?v=placeholder16",
    order: 3,
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
