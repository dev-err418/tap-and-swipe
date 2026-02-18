export const CATEGORIES = [
  { slug: "getting-started", title: "Getting Started", emoji: "🚀", order: 1 },
  { slug: "find-your-idea", title: "Find Your Idea", emoji: "💡", order: 2 },
  { slug: "design", title: "Design", emoji: "🎨", order: 3 },
  { slug: "build", title: "Build", emoji: "💻", order: 4 },
  { slug: "monetize", title: "Monetize", emoji: "💳", order: 5 },
  { slug: "launch-and-grow", title: "Launch & Grow", emoji: "📈", order: 6 },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
