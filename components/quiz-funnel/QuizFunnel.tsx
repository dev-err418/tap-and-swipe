"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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

const TOTAL_STEPS_FULL = 10; // 8 questions + optin + buffer
const TOTAL_STEPS_SKIP = 9; // 7 questions (skip Q3) + optin + buffer

type Variant = "quiz" | "direct";

function trackEvent(type: string, sessionId: string, variant: Variant, source?: string) {
  if (process.env.NODE_ENV === "development") return;
  fetch("/api/quiz-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, sessionId, variant, source: source || undefined }),
  }).catch(() => {});
}

export default function QuizFunnel({ serverReferrer, serverAppSource }: { serverReferrer?: string; serverAppSource?: string }) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<QuizStep>("hero");
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [firstName, setFirstName] = useState("");
  const [leadId, setLeadId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [variant, setVariant] = useState<Variant | null>(null);
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36),
  );
  const sourceRef = useRef<string | undefined>(undefined);

  // Determine variant on mount: URL param (debug) → sessionStorage → random 50/50
  useEffect(() => {
    const urlVariant = searchParams.get("variant");
    if (urlVariant === "quiz" || urlVariant === "direct") {
      setVariant(urlVariant);
      sessionStorage.setItem("quiz_variant", urlVariant);
      return;
    }
    const stored = sessionStorage.getItem("quiz_variant");
    if (stored === "quiz" || stored === "direct") {
      setVariant(stored);
      return;
    }
    const random: Variant = Math.random() < 0.5 ? "quiz" : "direct";
    setVariant(random);
    sessionStorage.setItem("quiz_variant", random);
  }, [searchParams]);

  // Capture UTM / referrer source on mount
  useEffect(() => {
    if (!variant) return;
    const utm =
      searchParams.get("utm") ||
      searchParams.get("utm_source") ||
      searchParams.get("source");
    if (utm) {
      sourceRef.current = utm;
    } else {
      let host: string | undefined;
      if (document.referrer) {
        try {
          host = new URL(document.referrer).hostname.replace(/^www\./, "");
        } catch {
          // invalid referrer URL
        }
      }
      if (host && host !== window.location.hostname) {
        sourceRef.current = host;
      } else if (serverReferrer && serverReferrer !== window.location.hostname) {
        sourceRef.current = serverReferrer;
      } else if (serverAppSource) {
        sourceRef.current = serverAppSource;
      }
    }
    trackEvent("page_view", sessionIdRef.current, variant, sourceRef.current);
  }, [variant, searchParams, serverReferrer, serverAppSource]);

  // Debug: ?step=optin or ?step=waiting or ?step=result-dev-indie
  useEffect(() => {
    const debugStep = searchParams.get("step") as QuizStep | null;
    if (debugStep && ["optin", "waiting", "result-dev-indie"].includes(debugStep)) {
      setFirstName("Debug");
      setStep(debugStep);
    }
  }, [searchParams]);

  const currentQuestionIndex = questionOrder.indexOf(step as QuestionKey);
  const isQuestion = currentQuestionIndex !== -1;

  // For variant B (direct), skip quiz entirely — go straight to result
  const isDirect = variant === "direct";
  const showProgressBar = !isDirect && (isQuestion || step === "optin");
  const showBack = !isDirect && (isQuestion || step === "optin");

  const skipsQ3 = answers.q2 === 2;
  const totalSteps = skipsQ3 ? TOTAL_STEPS_SKIP : TOTAL_STEPS_FULL;

  const effectiveIndex = isQuestion
    ? skipsQ3 && currentQuestionIndex >= 3
      ? currentQuestionIndex
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
      trackEvent("quiz_complete", sessionIdRef.current, variant || "quiz", sourceRef.current);
    }
    setStep(next);
  }

  function goBack() {
    setDirection(-1);
    setStep(getPrevQuestion(step as QuestionKey | "optin", answers));
  }

  function goToWaiting(name: string, id: string, em: string, ph: string) {
    setFirstName(name);
    setLeadId(id);
    setEmail(em);
    setPhone(ph);
    setDirection(1);
    setStep("waiting");
  }

  const goToResult = useCallback(() => {
    setDirection(1);
    setStep("result-dev-indie");
  }, []);

  const isResult = step === "result-dev-indie";
  const isScrollable = isResult || isDirect;

  // Wait for variant to be determined
  if (!variant) return null;

  // Variant B: render result page directly (no quiz, no progress bar)
  if (isDirect) {
    return (
      <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] font-sans selection:bg-[#f4cf8f]/30 relative">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#f4cf8f]/[0.03] blur-[120px]" />
        <div className="min-h-screen px-6 pt-32 pb-16">
          <ResultDevIndie
            firstName=""
            answers={{}}
            variant="direct"
            source={sourceRef.current}
            onBookingClick={() => trackEvent("booking_click", sessionIdRef.current, variant, sourceRef.current)}
          />
        </div>
      </div>
    );
  }

  // Variant A: existing quiz flow
  return (
    <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] font-sans selection:bg-[#f4cf8f]/30 relative">
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
              ? "min-h-screen px-6 pt-36 pb-16"
              : "flex min-h-screen items-center justify-center px-6 py-16 overflow-hidden"
          }
        >
          {step === "hero" && (
            <HeroScreen
              onStart={() => {
                trackEvent("quiz_start", sessionIdRef.current, variant, sourceRef.current);
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
              source={sourceRef.current}
              variant={variant}
              onSuccess={goToWaiting}
            />
          )}

          {step === "waiting" && <WaitingScreen onComplete={goToResult} />}

          {step === "result-dev-indie" && (
            <ResultDevIndie
              firstName={firstName}
              answers={answers}
              leadId={leadId}
              email={email}
              phone={phone}
              variant="quiz"
              source={sourceRef.current}
              onBookingClick={() => trackEvent("booking_click", sessionIdRef.current, variant, sourceRef.current)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
