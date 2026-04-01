"use client";

import { useState, useEffect, useRef, useId } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import {
  type QuizStep,
  type QuestionKey,
  questionOrder,
  getQuestionConfig,
  getProfileType,
  getNextQuestion,
  getPrevQuestion,
  getResultStep,
  getStepProgress,
} from "./quizData";
import HeroScreen from "./HeroScreen";
import QuestionScreen from "./QuestionScreen";
import OptinScreen from "./OptinScreen";
import ResultBusiness from "./ResultBusiness";

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

function trackEvent(type: string, sessionId: string, source?: string) {
  if (process.env.NODE_ENV === "development") return;
  fetch("/api/quiz-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, sessionId, source: source || undefined }),
  }).catch(() => {});
}

export default function QuizFunnel({
  serverReferrer,
  serverAppSource,
}: {
  serverReferrer?: string;
  serverAppSource?: string;
}) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<QuizStep>("hero");
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [firstName, setFirstName] = useState("");
  const [leadId, setLeadId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<string | undefined>(undefined);
  const sessionId = useId();
  const sourceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
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
    setSource(sourceRef.current);
    trackEvent("page_view", sessionId, sourceRef.current);
  }, [searchParams, serverReferrer, serverAppSource, sessionId]);

  const currentQuestionIndex = questionOrder.indexOf(step as QuestionKey);
  const isQuestion = currentQuestionIndex !== -1;
  const isResult = step.startsWith("result-");
  const profileType = getProfileType(answers);
  const showProgressBar = isQuestion || step === "optin";
  const showBack = isQuestion || step === "optin";
  const progressValue = isQuestion || step === "optin"
    ? getStepProgress(step as QuestionKey | "optin", answers)
    : 0;

  function goNext(questionKey: QuestionKey, answerIndex: number) {
    const newAnswers = { ...answers, [questionKey]: answerIndex };
    setAnswers(newAnswers);
    setDirection(1);
    const next = getNextQuestion(questionKey, newAnswers);
    if (next === "optin" || next === "result-disqualified") {
      trackEvent("quiz_complete", sessionId, sourceRef.current);
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
    setStep(getResultStep({ ...answers, firstName: name }));
  }

  return (
    <div className="relative min-h-screen bg-[#2a2725] font-sans text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4cf8f]/[0.03] blur-[120px]" />

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

      {showBack && (
        <button
          onClick={goBack}
          className="fixed top-6 left-6 z-50 flex cursor-pointer items-center gap-1.5 text-sm text-[#c9c4bc] transition-colors hover:text-[#f1ebe2]"
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
            isResult
              ? "min-h-screen px-6 pt-36 pb-16"
              : "flex min-h-screen items-center justify-center overflow-hidden px-6 py-16"
          }
        >
          {step === "hero" && (
            <HeroScreen
              onStart={() => {
                trackEvent("quiz_start", sessionId, sourceRef.current);
                setDirection(1);
                setStep("q1");
              }}
            />
          )}

          {isQuestion && (
            <QuestionScreen
              question={getQuestionConfig(step as QuestionKey, answers)}
              questionKey={step as QuestionKey}
              onAnswer={(answerIndex) => goNext(step as QuestionKey, answerIndex)}
            />
          )}

          {step === "optin" && (
            <OptinScreen
              answers={answers}
              profileType={profileType}
              source={source}
              onSuccess={goToWaiting}
            />
          )}

          {(step === "result-scale" ||
            step === "result-build" ||
            step === "result-disqualified") && (
            <ResultBusiness
              firstName={firstName}
              answers={answers}
              leadId={leadId}
              email={email}
              phone={phone}
              onBookingClick={() =>
                trackEvent("booking_click", sessionId, sourceRef.current)
              }
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
