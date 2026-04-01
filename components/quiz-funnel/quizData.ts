export type QuizStep =
  | "hero"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "optin"
  | "waiting"
  | "result-scale"
  | "result-build"
  | "result-disqualified";

export type QuestionKey = "q1" | "q2" | "q3" | "q4";

export type ProfileType = "scale" | "build" | "disqualified";

export interface AnswerOption {
  emoji: string;
  label: string;
}

export interface QuestionConfig {
  title: string;
  subtitle: string;
  answers: AnswerOption[];
}

export const questionOrder: QuestionKey[] = ["q1", "q2", "q3", "q4"];

export const questions: Record<QuestionKey, QuestionConfig> = {
  q1: {
    title: "Which best describes you?",
    subtitle: "I only want to talk to actual operators, not service sellers or people just browsing.",
    answers: [
      { emoji: "💼", label: "Business / Agency (€10k+ budget)" },
      { emoji: "👨‍💻", label: "Solo developer" },
      { emoji: "💭", label: "Just exploring" },
    ],
  },
  q2: {
    title: "Where is the business today?",
    subtitle: "I only want to show the path that actually fits your situation.",
    answers: [
      { emoji: "📈", label: "Live app, €3k-€50k MRR" },
      { emoji: "🌱", label: "Live app, under €3k MRR" },
      { emoji: "🛠️", label: "Not live" },
    ],
  },
  q3: {
    title: "What are you looking for right now?",
    subtitle: "One path only.",
    answers: [
      { emoji: "🚀", label: "Help me scale the app" },
      { emoji: "📱", label: "Help me build the app" },
    ],
  },
  q4: {
    title: "What is the main blocker to scaling right now?",
    subtitle: "Short and useful. No fluff.",
    answers: [
      { emoji: "🎯", label: "No channel visibility" },
      { emoji: "💸", label: "Paid ads feel blind" },
      { emoji: "📊", label: "Bad attribution" },
      { emoji: "📦", label: "Need the full system" },
    ],
  },
};

export function getQuestionConfig(
  questionKey: QuestionKey,
  answers: Record<string, number | string>,
): QuestionConfig {
  if (questionKey !== "q3") return questions[questionKey];

  const q2 = answers.q2 as number | undefined;
  if (q2 === 0) {
    return {
      ...questions.q3,
      answers: [
        { emoji: "🚀", label: "Help me scale the app" },
        { emoji: "🎯", label: "Help me fix ads scaling / attribution" },
      ],
    };
  }

  if (q2 === 2) {
    return {
      ...questions.q3,
      answers: [
        { emoji: "🚀", label: "Help me launch the app" },
        { emoji: "📱", label: "Help me build the app" },
      ],
    };
  }

  return questions.q3;
}

export function getProfileType(
  answers: Record<string, number | string>,
): ProfileType {
  const q1 = answers.q1 as number | undefined;
  const q2 = answers.q2 as number | undefined;
  const q3 = answers.q3 as number | undefined;

  if (q1 !== 0) return "disqualified";
  if (q2 === 0) return "scale";
  if (q2 === 2) return "build";
  if (q3 === 1) return "build";
  if (q3 === 0) return "scale";
  return "disqualified";
}

export function getResultStep(
  answers: Record<string, number | string>,
): Extract<QuizStep, "result-scale" | "result-build" | "result-disqualified"> {
  const profileType = getProfileType(answers);
  if (profileType === "scale") return "result-scale";
  if (profileType === "build") return "result-build";
  return "result-disqualified";
}

export function getNextQuestion(
  current: QuestionKey,
  answers: Record<string, number | string>,
): Exclude<QuizStep, "hero" | "waiting"> {
  if (current === "q1") {
    return (answers.q1 as number | undefined) === 0 ? "q2" : "result-disqualified";
  }

  if (current === "q2") return "q3";

  if (current === "q3") {
    const profileType = getProfileType(answers);
    if (profileType === "scale") return "q4";
    if (profileType === "build") return "optin";
    return "optin";
  }

  return "optin";
}

export function getPrevQuestion(
  current: QuestionKey | "optin",
  answers: Record<string, number | string>,
): QuestionKey | "hero" {
  if (current === "optin") {
    return getProfileType(answers) === "scale" ? "q4" : "q3";
  }

  const idx = questionOrder.indexOf(current as QuestionKey);
  if (idx <= 0) return "hero";
  return questionOrder[idx - 1];
}

export function getNeedLabel(profileType: ProfileType): string {
  if (profileType === "scale") {
    return "you already have traction and need a real scaling system";
  }

  if (profileType === "build") {
    return "you need the right product partner to build or improve the app";
  }

  return "this offer is not the right fit for your current stage";
}

export function getStepProgress(
  step: QuestionKey | "optin",
  _answers: Record<string, number | string>,
): number {
  void _answers;
  if (step === "q1") return 1 / 4;
  if (step === "q2") return 2 / 4;
  if (step === "q3") return 3 / 4;
  if (step === "q4") return 4 / 5;
  if (step === "optin") return 1;
  return 0;
}
