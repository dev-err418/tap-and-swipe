export const CATEGORIES = [
  { slug: "getting-started", title: "Getting started", emoji: "🚀", order: 1 },
  { slug: "find-your-idea", title: "Find your idea", emoji: "💡", order: 2 },
  { slug: "design", title: "Design", emoji: "🎨", order: 3 },
  { slug: "build", title: "Build", emoji: "💻", order: 4 },
  { slug: "build-with-boilerplate", title: "Build with the boilerplate", emoji: "⚡", order: 5 },
  { slug: "monetize", title: "Monetize", emoji: "💳", order: 6 },
  { slug: "launch-and-grow", title: "Launch & grow", emoji: "📈", order: 7 },
  { slug: "scaling", title: "Scaling", emoji: "📊", order: 8 },
  { slug: "weekly-calls", title: "Weekly call replays", emoji: "🎙️", order: 9 },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
