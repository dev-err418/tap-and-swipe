export const CATEGORIES = [
  { slug: "getting-started", title: "Getting started", subtitle: "Set up your tools and environment", emoji: "🚀", order: 1 },
  { slug: "find-your-idea", title: "Find your idea", subtitle: "Discover a profitable app concept", emoji: "💡", order: 2 },
  { slug: "design", title: "Design", subtitle: "Create beautiful screens that convert", emoji: "🎨", order: 3 },
  { slug: "build", title: "Build", subtitle: "Code your app from scratch in Swift", emoji: "💻", order: 4 },
  { slug: "build-with-boilerplate", title: "Build with the boilerplate", subtitle: "Ship faster with the starter template", emoji: "⚡", order: 5 },
  { slug: "monetize", title: "Monetize", subtitle: "Add subscriptions and maximize revenue", emoji: "💳", order: 6 },
  { slug: "launch-and-grow", title: "Launch & grow", subtitle: "Get featured and acquire your first users", emoji: "📈", order: 7 },
  { slug: "scaling", title: "Scaling", subtitle: "Grow beyond your first 1,000 users", emoji: "📊", order: 8 },
  { slug: "weekly-calls", title: "Weekly call replays", subtitle: "Live Q&A sessions with the community", emoji: "🎙️", order: 9 },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
