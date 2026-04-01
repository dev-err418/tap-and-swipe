"use client";

import { ArrowRight } from "lucide-react";
import type { QuestionConfig, QuestionKey } from "./quizData";

export default function QuestionScreen({
  question,
  questionKey,
  onAnswer,
}: {
  question: QuestionConfig;
  questionKey: QuestionKey;
  onAnswer: (answerIndex: number) => void;
}) {
  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto w-full">
      <h2 className="text-4xl font-extrabold tracking-tight leading-tight sm:text-5xl mb-10 w-[120%]">
        {question.title}
      </h2>

      <div className="flex flex-col gap-4 w-full max-w-xl">
        {question.answers.map((answer, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            data-fast-goal={`quiz_${questionKey}_answer_${i + 1}`}
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-left transition-all hover:bg-white/10 hover:border-[#f4cf8f]/30 hover:ring-2 hover:ring-[#f4cf8f]/10 cursor-pointer"
          >
            <span className="text-2xl shrink-0">{answer.emoji}</span>
            <span className="text-[#f1ebe2] text-base font-medium leading-snug">
              {answer.label}
            </span>
            <ArrowRight className="h-4 w-4 text-[#c9c4bc] shrink-0 ml-auto opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
