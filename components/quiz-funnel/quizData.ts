// ─── Types ──────────────────────────────────────────────────────────
export type QuizStep =
  | "hero"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7"
  | "q8"
  | "q9"
  | "optin"
  | "waiting"
  | "result-dev-indie"
  | "result-entreprise";

export type QuestionKey =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7"
  | "q8"
  | "q9";

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
  "q6",
  "q7",
  "q8",
  "q9",
];

// ─── Questions ──────────────────────────────────────────────────────
export const questions: Record<QuestionKey, QuestionConfig> = {
  q1: {
    title: "What's your current situation?",
    subtitle: "",
    answers: [
      { emoji: "🧑‍💻", label: "I'm a salaried dev and I want to launch a profitable side project" },
      { emoji: "🚀", label: "I'm an indie dev / freelancer and I want to build my own apps" },
      { emoji: "🏢", label: "I already have a business (SaaS, course, e-commerce...) and I want to add a mobile app" },
      { emoji: "💡", label: "I have an app idea but I don't know how to code" },
    ],
  },
  q2: {
    title: "Have you ever published an app on the App Store or Play Store?",
    subtitle: "",
    answers: [
      { emoji: "✅", label: "Yes, I have one or more published apps" },
      { emoji: "🛠️", label: "I have an app in development" },
      { emoji: "❌", label: "No, never" },
    ],
  },
  q3: {
    title: "Are you already generating revenue from a mobile app?",
    subtitle: "",
    answers: [
      { emoji: "💰", label: "Yes, more than $500/month" },
      { emoji: "💵", label: "Yes, but less than $500/month" },
      { emoji: "🆓", label: "No, no revenue yet" },
      { emoji: "🤷", label: "I'm not sure how to monetize an app" },
    ],
  },
  q4: {
    title: "What's your biggest blocker right now?",
    subtitle: "",
    answers: [
      { emoji: "🧩", label: "I don't know which app idea to pick" },
      { emoji: "💻", label: "I don't know how to properly build an app" },
      { emoji: "📣", label: "I have an app but nobody downloads it" },
      { emoji: "💰", label: "I have downloads but no revenue" },
      { emoji: "📈", label: "I don't know how to scale beyond my first revenue" },
    ],
  },
  q5: {
    title: "How many hours per week can you dedicate to your app project?",
    subtitle: "",
    answers: [
      { emoji: "⏳", label: "Less than 5h/week" },
      { emoji: "💪", label: "5 to 15h/week" },
      { emoji: "🔥", label: "15 to 30h/week" },
      { emoji: "⚡", label: "30h+/week (full-time)" },
    ],
  },
  q6: {
    title: "What's your ideal goal in the next 6 months?",
    subtitle: "",
    answers: [
      { emoji: "🚀", label: "Launch my first app and get my first users" },
      { emoji: "💰", label: "Reach $3,000/month in recurring revenue (MRR)" },
      { emoji: "🔥", label: "Replace my salary with app revenue" },
      { emoji: "🏢", label: "Add a profitable app to my existing business" },
    ],
  },
  q7: {
    title: "What's stopped you from getting there so far?",
    subtitle: "",
    answers: [
      { emoji: "🤯", label: "I don't know where to start — too much conflicting info" },
      { emoji: "🧭", label: "I lack structure and guidance" },
      { emoji: "🔧", label: "I don't have the technical skills (payments, analytics, ASO...)" },
      { emoji: "⏰", label: "I don't have enough time" },
      { emoji: "😔", label: "I've already tried and it didn't work" },
    ],
  },
  q8: {
    title: "Are you ready to invest in mentorship to accelerate your results?",
    subtitle: "",
    answers: [
      { emoji: "💎", label: "Yes, if it's the right program, I'm ready to invest" },
      { emoji: "🤔", label: "Maybe — depends on the format and price" },
      { emoji: "🆓", label: "No, I prefer learning on my own for now" },
    ],
  },
  q9: {
    title: "How did you discover Arthur / Arthur Builds Stuff?",
    subtitle: "",
    answers: [
      { emoji: "📺", label: "YouTube" },
      { emoji: "📸", label: "Instagram" },
      { emoji: "🗣️", label: "Word of mouth / referral" },
      { emoji: "🔍", label: "Google search" },
      { emoji: "🌐", label: "Other" },
    ],
  },
};

// ─── Navigation Helpers ─────────────────────────────────────────────

export function getNextQuestion(
  current: QuestionKey,
  answers: Record<string, number>,
): QuestionKey | "optin" {
  const idx = questionOrder.indexOf(current);
  // Skip Q3 (revenue) if Q2 answer is "No, never" (index 2)
  if (current === "q2" && answers.q2 === 2) {
    return "q4";
  }
  if (idx < questionOrder.length - 1) return questionOrder[idx + 1];
  return "optin";
}

export function getPrevQuestion(
  current: QuestionKey | "optin",
  answers: Record<string, number>,
): QuestionKey | "hero" {
  if (current === "optin") return questionOrder[questionOrder.length - 1];
  const idx = questionOrder.indexOf(current as QuestionKey);
  // Skip back over Q3 if it was skipped going forward
  if (current === "q4" && answers.q2 === 2) {
    return "q2";
  }
  if (idx <= 0) return "hero";
  return questionOrder[idx - 1];
}

// ─── Segmentation Logic ─────────────────────────────────────────────

/** Q1 index 2 (Entrepreneur/CEO) → entreprise, else → dev-indie */
export function getProfileType(q1Index: number): "dev-indie" | "entreprise" {
  return q1Index === 2 ? "entreprise" : "dev-indie";
}

/** Map Q4 answer index to blocker text for result pages */
const blockerLabels = [
  "you don't know which app idea to pick",
  "you don't know how to properly build an app",
  "you have an app but nobody downloads it",
  "you have downloads but no revenue",
  "you don't know how to scale beyond your first revenue",
];

export function getBlockageLabel(q5Index: number): string {
  return blockerLabels[q5Index] ?? blockerLabels[0];
}
