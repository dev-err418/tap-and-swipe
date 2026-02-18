import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const videos = [
  // Idea & Validation
  { category: "idea-validation", title: "Finding Profitable App Ideas", description: "How to identify app ideas with real demand", youtubeUrl: "https://www.youtube.com/watch?v=placeholder1", order: 1 },
  { category: "idea-validation", title: "Keyword Research with Astro", description: "Use Astro to find high-traffic keywords", youtubeUrl: "https://www.youtube.com/watch?v=placeholder2", order: 2 },
  { category: "idea-validation", title: "Competitor Revenue Analysis", description: "Check if competitors are making money", youtubeUrl: "https://www.youtube.com/watch?v=placeholder3", order: 3 },

  // Design UI/UX
  { category: "design-ui-ux", title: "Designing in Figma with AI", description: "Speed up your design workflow with AI tools", youtubeUrl: "https://www.youtube.com/watch?v=placeholder4", order: 1 },
  { category: "design-ui-ux", title: "Studying Top Apps on Mobbin", description: "Learn from the best UI patterns", youtubeUrl: "https://www.youtube.com/watch?v=placeholder5", order: 2 },
  { category: "design-ui-ux", title: "Designing CTAs That Convert", description: "Make your call-to-actions impossible to miss", youtubeUrl: "https://www.youtube.com/watch?v=placeholder6", order: 3 },

  // Development
  { category: "development", title: "Setting Up Expo & React Native", description: "Get your dev environment ready", youtubeUrl: "https://www.youtube.com/watch?v=placeholder7", order: 1 },
  { category: "development", title: "Building with AI Coding Tools", description: "Use Claude and Cursor to move 10x faster", youtubeUrl: "https://www.youtube.com/watch?v=placeholder8", order: 2 },
  { category: "development", title: "Crash Monitoring with Sentry", description: "Set up error tracking from day one", youtubeUrl: "https://www.youtube.com/watch?v=placeholder9", order: 3 },
  { category: "development", title: "Analytics & Backend Setup", description: "Posthog analytics and Supabase backend", youtubeUrl: "https://www.youtube.com/watch?v=placeholder10", order: 4 },

  // Paywall & Monetization
  { category: "paywall-monetization", title: "RevenueCat & Superwall Setup", description: "Set up your paywall infrastructure", youtubeUrl: "https://www.youtube.com/watch?v=placeholder11", order: 1 },
  { category: "paywall-monetization", title: "Localized Pricing Strategy", description: "Price differently per region", youtubeUrl: "https://www.youtube.com/watch?v=placeholder12", order: 2 },
  { category: "paywall-monetization", title: "A/B Testing Paywalls", description: "Optimize for maximum conversion", youtubeUrl: "https://www.youtube.com/watch?v=placeholder13", order: 3 },

  // Marketing
  { category: "marketing", title: "ASO Keyword Optimization", description: "Rank higher in the App Store", youtubeUrl: "https://www.youtube.com/watch?v=placeholder14", order: 1 },
  { category: "marketing", title: "Apple Search Ads", description: "Targeted installs through paid ads", youtubeUrl: "https://www.youtube.com/watch?v=placeholder15", order: 2 },
  { category: "marketing", title: "TikTok Geo-Targeting", description: "Viral reach with TikTok marketing", youtubeUrl: "https://www.youtube.com/watch?v=placeholder16", order: 3 },
];

async function main() {
  console.log("Seeding videos...");

  for (const video of videos) {
    await prisma.video.upsert({
      where: {
        id: `seed-${video.category}-${video.order}`,
      },
      update: {
        title: video.title,
        description: video.description,
        youtubeUrl: video.youtubeUrl,
      },
      create: {
        id: `seed-${video.category}-${video.order}`,
        ...video,
      },
    });
  }

  console.log(`Seeded ${videos.length} videos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
