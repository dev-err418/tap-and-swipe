"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import AnalyticsTracker from "../AnalyticsTracker";
import {
  type QuizStep,
  type QuestionKey,
  questionOrder,
  questions,
  getProfileType,
  getNextQuestion,
  getPrevQuestion,
} from "./quizData";
import HeroScreen from "./HeroScreen";
import QuestionScreen from "./QuestionScreen";
import OptinScreen from "./OptinScreen";
import WaitingScreen from "./WaitingScreen";
import ResultDevIndie from "./ResultDevIndie";
import ResultEntreprise from "./ResultEntreprise";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const TOTAL_STEPS_FULL = 11; // 9 questions + optin + buffer
const TOTAL_STEPS_SKIP = 10; // 8 questions (skip Q3) + optin + buffer

function trackEvent(type: string, sessionId: string) {
  fetch("/api/quiz-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, sessionId }),
  }).catch(() => {});
}

export default function QuizFunnel() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<QuizStep>("hero");
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [firstName, setFirstName] = useState("");
  const [leadId, setLeadId] = useState("");
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36),
  );

  // Track page view on mount
  useEffect(() => {
    trackEvent("page_view", sessionIdRef.current);
  }, []);

  // Debug: ?step=waiting or ?step=result-dev-indie or ?step=result-entreprise
  useEffect(() => {
    const debugStep = searchParams.get("step") as QuizStep | null;
    if (debugStep && ["waiting", "result-dev-indie", "result-entreprise"].includes(debugStep)) {
      setFirstName("Debug");
      setStep(debugStep);
    }
  }, [searchParams]);

  const currentQuestionIndex = questionOrder.indexOf(step as QuestionKey);
  const isQuestion = currentQuestionIndex !== -1;
  const showProgressBar = isQuestion || step === "optin";
  const showBack = isQuestion || step === "optin";

  const skipsQ3 = answers.q2 === 2;
  const totalSteps = skipsQ3 ? TOTAL_STEPS_SKIP : TOTAL_STEPS_FULL;

  const effectiveIndex = isQuestion
    ? skipsQ3 && currentQuestionIndex >= 3 // q4 is index 3
      ? currentQuestionIndex // already shifted down by 1 vs full path
      : currentQuestionIndex + 1
    : 0;

  const progressValue =
    step === "optin"
      ? (totalSteps - 1) / totalSteps
      : isQuestion
        ? effectiveIndex / totalSteps
        : 0;

  function goNext(questionKey: QuestionKey, answerIndex: number) {
    const newAnswers = { ...answers, [questionKey]: answerIndex };
    setAnswers(newAnswers);
    setDirection(1);
    const next = getNextQuestion(questionKey, newAnswers);
    if (next === "optin") {
      trackEvent("quiz_complete", sessionIdRef.current);
    }
    setStep(next);
  }

  function goBack() {
    setDirection(-1);
    setStep(getPrevQuestion(step as QuestionKey | "optin", answers));
  }

  function goToWaiting(name: string, id: string) {
    setFirstName(name);
    setLeadId(id);
    setDirection(1);
    setStep("waiting");
  }

  const goToResult = useCallback(() => {
    setDirection(1);
    const profileType = getProfileType(answers.q1 ?? 0);
    setStep(profileType === "entreprise" ? "result-entreprise" : "result-dev-indie");
  }, [answers.q1]);

  const isResult = step === "result-dev-indie" || step === "result-entreprise";
  const isScrollable = isResult;

  return (
    <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] font-sans selection:bg-[#f4cf8f]/30 relative">
      <AnalyticsTracker />

      {/* Background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#f4cf8f]/[0.03] blur-[120px]" />

      {/* Progress bar */}
      {showProgressBar && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/5">
          <motion.div
            className="h-full bg-[#f4cf8f]"
            initial={{ width: "0%" }}
            animate={{ width: `${progressValue * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Back button */}
      {showBack && (
        <button
          onClick={goBack}
          className="fixed top-6 left-6 z-50 flex items-center gap-1.5 text-sm text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={
            isScrollable
              ? "min-h-screen px-6 py-16"
              : "flex min-h-screen items-center justify-center px-6 py-16 overflow-hidden"
          }
        >
          {step === "hero" && (
            <HeroScreen
              onStart={() => {
                trackEvent("quiz_start", sessionIdRef.current);
                setDirection(1);
                setStep("q1");
              }}
            />
          )}

          {isQuestion && (
            <QuestionScreen
              question={questions[step as QuestionKey]}
              questionKey={step as QuestionKey}
              onAnswer={(answerIndex) => goNext(step as QuestionKey, answerIndex)}
            />
          )}

          {step === "optin" && (
            <OptinScreen
              answers={answers}
              profileType={getProfileType(answers.q1 ?? 0)}
              onSuccess={goToWaiting}
            />
          )}

          {step === "waiting" && <WaitingScreen onComplete={goToResult} />}

          {step === "result-dev-indie" && (
            <ResultDevIndie
              firstName={firstName}
              answers={answers}
              leadId={leadId}
              onBookingClick={() => trackEvent("booking_click", sessionIdRef.current)}
            />
          )}

          {step === "result-entreprise" && (
            <ResultEntreprise
              firstName={firstName}
              answers={answers}
              leadId={leadId}
              onBookingClick={() => trackEvent("booking_click", sessionIdRef.current)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
