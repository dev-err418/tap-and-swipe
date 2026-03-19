// ─── Types ──────────────────────────────────────────────────────────
export type QuizStep =
  | "hero"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "note"
  | "optin"
  | "waiting"
  | "result-business";

export type QuestionKey = "q1" | "q2" | "q3" | "q4" | "q5";

export interface AnswerOption {
  emoji: string;
  label: string;
}

export interface QuestionConfig {
  title: string;
  subtitle: string;
  answers: AnswerOption[];
}

// ─── Question Order ─────────────────────────────────────────────────
export const questionOrder: QuestionKey[] = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
];

// ─── Questions ──────────────────────────────────────────────────────
export const questions: Record<QuestionKey, QuestionConfig> = {
  q1: {
    title: "What best describes your business?",
    subtitle: "",
    answers: [
      { emoji: "🏢", label: "Local / service-based business" },
      { emoji: "🛒", label: "E-commerce / product business" },
      { emoji: "🧑‍💻", label: "SaaS / digital platform" },
      { emoji: "🚀", label: "Startup, the app is my product" },
      { emoji: "💼", label: "Other (corporate, internal tool...)" },
    ],
  },
  q2: {
    title: "Where are you with your mobile app?",
    subtitle: "",
    answers: [
      { emoji: "💡", label: "Just an idea, haven't started" },
      { emoji: "📝", label: "Specs or mockups, no code yet" },
      { emoji: "🛠️", label: "In development, not live yet" },
      { emoji: "📱", label: "Live app, needs improvements" },
    ],
  },
  q3: {
    title: "What do you need the most help with?",
    subtitle: "",
    answers: [
      { emoji: "🧭", label: "Strategy and guidance" },
      { emoji: "💻", label: "Development" },
      { emoji: "📈", label: "Growth and monetization" },
      { emoji: "🤝", label: "Strategy + development" },
    ],
  },
  q4: {
    title: "Do you currently have a technical team?",
    subtitle: "",
    answers: [
      { emoji: "👨‍💻", label: "Yes, but I need extra help" },
      { emoji: "🧑‍💼", label: "No, I need a full solution" },
      { emoji: "🤝", label: "Yes, but I'm not satisfied" },
    ],
  },
  q5: {
    title: "Are you ready to invest in getting your app built the right way?",
    subtitle: "",
    answers: [
      { emoji: "💎", label: "Yes, budget ready" },
      { emoji: "🤔", label: "Exploring options" },
      { emoji: "🔍", label: "Just researching for now" },
    ],
  },
};

// ─── Navigation Helpers ─────────────────────────────────────────────

export function getNextQuestion(
  current: QuestionKey,
  _answers: Record<string, number | string>,
): QuestionKey | "note" {
  const idx = questionOrder.indexOf(current);
  if (idx < questionOrder.length - 1) return questionOrder[idx + 1];
  return "note";
}

export function getPrevQuestion(
  current: QuestionKey | "note" | "optin",
  _answers: Record<string, number | string>,
): QuestionKey | "hero" {
  if (current === "optin") return "note" as QuestionKey | "hero";
  if (current === "note") return questionOrder[questionOrder.length - 1];
  const idx = questionOrder.indexOf(current as QuestionKey);
  if (idx <= 0) return "hero";
  return questionOrder[idx - 1];
}

// ─── Segmentation Logic ─────────────────────────────────────────────

export type ProfileType = "consulting" | "development" | "growth" | "full-partner";

/** Derive profile type from Q3 answer */
export function getProfileType(q3Index: number): ProfileType {
  switch (q3Index) {
    case 0: return "consulting";
    case 1: return "development";
    case 2: return "growth";
    case 3: return "full-partner";
    default: return "consulting";
  }
}

/** Map Q3 answer index to need label for result pages */
const needLabels = [
  "you need strategic guidance on what to build",
  "you need someone to build or rebuild your app",
  "you need help with growth and monetization",
  "you need a full partner for strategy and development",
];

export function getNeedLabel(q3Index: number): string {
  return needLabels[q3Index] ?? needLabels[0];
}
