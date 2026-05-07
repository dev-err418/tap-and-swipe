"use client";

import { useState, useCallback, useEffect, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, LoaderCircle } from "lucide-react";
import Cal, { getCalApi } from "@calcom/embed-react";
import {
  HAS_APP_LABEL,
  REVENUE_LABEL,
  BUSINESS_TYPE_LABEL,
  BUDGET_LABEL,
} from "@/lib/join-labels";
import PageTracker, {
  getVisitorId,
  getSessionId,
  getRef,
  fire,
} from "@/components/PageTracker";

const CAL_LINK = "arthur-builds-stuff/app-sprint-application";

// ── Step definitions ────────────────────────────────────────────────

type StepId =
  | "firstName"
  | "email"
  | "hasApp"
  | "revenue"
  | "challenge"
  | "businessType"
  | "budget"
  | "confirmation";

const APP_OPTIONS = [
  { value: "revenue", label: "Yes, and I'm making revenue" },
  { value: "no-revenue", label: "Yes, but no revenue yet" },
  { value: "no", label: "No" },
] as const;

const REVENUE_OPTIONS = [
  { value: "under-1k", label: "<$1K" },
  { value: "1k-5k", label: "$1K – $5K" },
  { value: "5k-20k", label: "$5K – $20K" },
  { value: "20k-50k", label: "$20K – $50K" },
  { value: "50k-plus", label: "$50K+" },
] as const;

const BUSINESS_TYPE_OPTIONS = [
  { value: "individual", label: "Individual, just me" },
  { value: "business", label: "A registered business or company" },
] as const;

const BUDGET_OPTIONS = [
  { value: "under-2000", label: "Under $2,000" },
  { value: "2000-4000", label: "$2,000 – $4,000" },
  { value: "4000-8000", label: "$4,000 – $8,000" },
  { value: "8000-plus", label: "$8,000+" },
  { value: "not-sure", label: "Not sure yet" },
] as const;

const HIGH_TICKET_BUDGETS = ["2000-4000", "4000-8000", "8000-plus"];
const CHALLENGE_MIN_CHARS = 50;

// Steps visible on the path the user has selected so far
function getVisibleSteps(hasApp: string, businessType: string): StepId[] {
  const steps: StepId[] = ["firstName", "email", "hasApp"];
  if (hasApp === "revenue") steps.push("revenue");
  steps.push("challenge", "businessType");
  if (businessType === "business") steps.push("budget");
  return steps;
}

function getStepNumber(stepId: StepId, hasApp: string, businessType: string) {
  return getVisibleSteps(hasApp, businessType).indexOf(stepId) + 1;
}

// ── Helpers ─────────────────────────────────────────────────────────

function isStepAnswered(
  stepId: StepId,
  state: {
    firstName: string;
    email: string;
    hasApp: string;
    revenue: string;
    challenge: string;
    businessType: string;
  },
) {
  switch (stepId) {
    case "firstName":
      return state.firstName.trim().length > 0;
    case "email":
      return state.email.trim().length > 0;
    case "hasApp":
      return state.hasApp.length > 0;
    case "revenue":
      return state.revenue.length > 0;
    case "challenge":
      return state.challenge.trim().length >= CHALLENGE_MIN_CHARS;
    case "businessType":
      return state.businessType.length > 0;
    case "budget":
    case "confirmation":
      return false; // terminal steps
  }
}

// ── Component ───────────────────────────────────────────────────────

export default function JoinClient({ allowHighTicket = true }: { allowHighTicket?: boolean }) {
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const debugLoading = !!searchParams?.has("loading");
  // ?skip=confirmation jumps to the cal.com booking step with stub data;
  // ?skip=community jumps to the community redirect path.
  const debugSkip = searchParams?.get("skip") || "";

  // Restore saved state from sessionStorage (skipped when debug-skipping)
  const saved = !debugSkip && typeof window !== "undefined"
    ? (() => { try { return JSON.parse(sessionStorage.getItem("join_quiz") || "{}"); } catch { return {}; } })()
    : {};

  const [step, setStep] = useState<StepId>(
    debugSkip === "confirmation" ? "confirmation" : "firstName",
  );
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(debugLoading || debugSkip === "community");
  const [direction, setDirection] = useState<1 | -1>(1);

  // Form state
  const [firstName, setFirstName] = useState(saved.firstName || (debugSkip ? "Debug" : ""));
  const [email, setEmail] = useState(saved.email || (debugSkip ? "debug@example.com" : ""));
  const [hasApp, setHasApp] = useState(saved.hasApp || (debugSkip ? "revenue" : ""));
  const [revenue, setRevenue] = useState(saved.revenue || (debugSkip ? "5k-20k" : ""));
  const [challenge, setChallenge] = useState(
    saved.challenge ||
      (debugSkip
        ? "Debug skip — stub answer to clear the 50 character minimum so the form can be tested end-to-end."
        : ""),
  );
  const [businessType, setBusinessType] = useState(saved.businessType || (debugSkip ? "business" : ""));
  const [budget, setBudget] = useState(saved.budget || (debugSkip ? "4000-8000" : ""));
  const [error, setError] = useState("");

  // ?skip=community: trigger the redirect path on mount
  useEffect(() => {
    if (debugSkip === "community") {
      const t = setTimeout(() => router.push("/community"), 300);
      return () => clearTimeout(t);
    }
  }, [debugSkip, router]);

  const visibleSteps = useMemo(
    () => getVisibleSteps(hasApp, businessType),
    [hasApp, businessType],
  );
  const stepIndex = visibleSteps.indexOf(step);
  const totalSteps = visibleSteps.length;
  const formState = useMemo(
    () => ({ firstName, email, hasApp, revenue, challenge, businessType }),
    [firstName, email, hasApp, revenue, challenge, businessType],
  );

  // Persist answers to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      "join_quiz",
      JSON.stringify({ step, firstName, email, hasApp, revenue, challenge, businessType, budget }),
    );
  }, [step, firstName, email, hasApp, revenue, challenge, businessType, budget]);

  // ── Navigation ──────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (step === "confirmation") return;
    if (stepIndex < 0 || stepIndex >= visibleSteps.length - 1) return;
    if (!isStepAnswered(step, formState)) {
      if (step === "challenge") {
        setError(`Please write at least ${CHALLENGE_MIN_CHARS} characters`);
      } else {
        setError("Please fill in this field");
      }
      return;
    }
    if (step === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
      setError("Please enter a valid email");
      return;
    }
    setError("");

    // Fire quiz_start on leaving first step
    if (step === "firstName") {
      const visitorId = getVisitorId();
      const sessionId = getSessionId("quiz");
      const ref = getRef();
      fire("quiz", "quiz_start", visitorId, sessionId, { ref });
    }

    setDirection(1);
    setStep(visibleSteps[stepIndex + 1]);
  }, [step, stepIndex, visibleSteps, formState]);

  const goPrev = useCallback(() => {
    if (stepIndex <= 0) return;
    setError("");
    setDirection(-1);
    setStep(visibleSteps[stepIndex - 1]);
  }, [stepIndex, visibleSteps]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleTextSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      goNext();
    },
    [goNext],
  );

  const handleAppSelect = useCallback(
    (value: string) => {
      setHasApp(value);
      setDirection(1);
      // Show revenue step only when the user is making revenue
      setStep(value === "revenue" ? "revenue" : "challenge");
    },
    [],
  );

  const handleRevenueSelect = useCallback(
    (value: string) => {
      setRevenue(value);
      setDirection(1);
      setStep("challenge");
    },
    [],
  );

  const submitQuiz = useCallback(
    async (selectedBusinessType: string, budget: string | undefined) => {
      const highTicket =
        allowHighTicket &&
        !!budget &&
        HIGH_TICKET_BUDGETS.includes(budget);
      const route = highTicket ? "coaching" : "community";

      const visitorId = getVisitorId();
      const sessionId = getSessionId("quiz");
      const ref = getRef();

      fire("quiz", "quiz_complete", visitorId, sessionId, {
        ref: ref ? `${ref}|quiz->${route}` : `quiz->${route}`,
      });

      try {
        await fetch("/api/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            email: email.trim(),
            hasApp,
            revenue: revenue || undefined,
            challenge: challenge.trim() || undefined,
            businessType: selectedBusinessType,
            budget,
            route,
            ref: ref || undefined,
          }),
        });
      } catch {}

      sessionStorage.removeItem("join_quiz");

      if (highTicket) {
        // Show inline cal.com embed instead of redirecting
        setDirection(1);
        setStep("confirmation");
        setSubmitting(false);
        return;
      }

      setLoading(true);
      await new Promise((r) => setTimeout(r, 800));
      router.push("/community");
    },
    [firstName, email, hasApp, revenue, challenge, allowHighTicket, router],
  );

  const handleBusinessTypeSelect = useCallback(
    async (value: string) => {
      if (submitting) return;
      setBusinessType(value);
      if (value === "individual") {
        setSubmitting(true);
        await submitQuiz(value, undefined);
        return;
      }
      setDirection(1);
      setStep("budget");
    },
    [submitting, submitQuiz],
  );

  const handleBudgetSelect = useCallback(
    async (selectedBudget: string) => {
      if (submitting) return;
      setBudget(selectedBudget);
      setSubmitting(true);
      await submitQuiz(businessType, selectedBudget);
    },
    [businessType, submitting, submitQuiz],
  );

  // Keyboard arrows + number keys for multi-choice
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (step === "confirmation") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
      const idx = e.key.toLowerCase().charCodeAt(0) - 97; // a=0, b=1, c=2...
      if (e.key.length === 1 && idx >= 0 && idx < 26) {
        if (step === "hasApp" && idx < APP_OPTIONS.length) {
          e.preventDefault();
          handleAppSelect(APP_OPTIONS[idx].value);
        }
        if (step === "revenue" && idx < REVENUE_OPTIONS.length) {
          e.preventDefault();
          handleRevenueSelect(REVENUE_OPTIONS[idx].value);
        }
        if (step === "businessType" && idx < BUSINESS_TYPE_OPTIONS.length && !submitting) {
          e.preventDefault();
          handleBusinessTypeSelect(BUSINESS_TYPE_OPTIONS[idx].value);
        }
        if (step === "budget" && idx < BUDGET_OPTIONS.length && !submitting) {
          e.preventDefault();
          handleBudgetSelect(BUDGET_OPTIONS[idx].value);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    goNext,
    goPrev,
    step,
    submitting,
    handleAppSelect,
    handleRevenueSelect,
    handleBusinessTypeSelect,
    handleBudgetSelect,
  ]);

  const canGoBack = stepIndex > 0 && step !== "confirmation";
  const isMultiChoice =
    step === "hasApp" ||
    step === "revenue" ||
    step === "businessType" ||
    step === "budget";
  const canGoForward =
    !isMultiChoice &&
    step !== "confirmation" &&
    stepIndex < visibleSteps.length - 1 &&
    (stepIndex > 0 || isStepAnswered(step, formState));

  if (loading) {
    return (
      <div
        className="-mt-[var(--navbar-h)] flex h-dvh flex-col items-center justify-center px-6"
        style={{ "--navbar-h": "68px" } as React.CSSProperties}
      >
        <LoaderCircle className="h-5 w-5 animate-spin text-black" />
      </div>
    );
  }

  const challengeCount = challenge.trim().length;
  const challengeMet = challengeCount >= CHALLENGE_MIN_CHARS;

  const stepNumber = (id: StepId) => getStepNumber(id, hasApp, businessType);

  if (step === "confirmation") {
    return (
      <CalConfirmation
        firstName={firstName.trim()}
        email={email.trim()}
        hasApp={hasApp}
        revenue={revenue}
        challenge={challenge.trim()}
        businessType={businessType}
        budget={budget}
      />
    );
  }

  return (
    <div
      className="-mt-[var(--navbar-h)] flex h-dvh flex-col items-center justify-center px-6"
      style={{ "--navbar-h": "68px" } as React.CSSProperties}
    >
      <PageTracker product="quiz" />

      <div className="mb-4 w-full max-w-xl rounded-3xl border border-black/10 bg-white px-8 py-6 text-center shadow-sm sm:px-12">
        <p className="text-2xl font-bold leading-tight tracking-tight text-black sm:text-3xl">
          <span className="text-[#FF9500]">Step 1 of 2:</span> Find the right fit in our app founder ecosystem
        </p>
      </div>

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
        {/* Progress bar */}
        <div className="h-1 w-full bg-black/5">
          <motion.div
            className="h-full bg-[#FF9500]"
            initial={false}
            animate={{
              width: `${Math.min(((stepIndex + 1) / totalSteps) * 100, 100)}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Logo + Steps */}
        <div className="flex h-[440px] flex-col overflow-y-auto px-8 pb-20 pt-8 sm:px-12 sm:pt-10">
          <div className="mb-8 flex justify-center">
            <img
              src="/icon.png"
              alt="Tap & Swipe"
              width={28}
              height={28}
              className="rounded-md"
            />
          </div>
          <div className="flex flex-1 flex-col justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {step === "firstName" && (
              <motion.form
                key="firstName"
                initial={{ opacity: 0, y: direction * 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleTextSubmit}
              >
                <div className="mb-6 flex items-start justify-center gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FF9500] text-xs font-bold text-white">
                    {stepNumber("firstName")}
                  </span>
                  <label
                    htmlFor="firstName"
                    className="text-xl font-semibold text-black"
                  >
                    What&apos;s your first name?<span className="text-[#FF9500]">*</span>
                  </label>
                </div>
                <input
                  id="firstName"
                  type="text"
                  required
                  autoFocus
                  autoComplete="off"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setError(""); }}
                  placeholder="Type your answer here..."
                  className="mt-6 w-full border-b-2 border-black/10 bg-transparent pb-2 text-lg text-black placeholder:text-black/25 focus:border-[#FF9500] focus:outline-none"
                />
                {error && step === "firstName" && (
                  <p className="mt-2 text-xs text-red-500">{error}</p>
                )}
                <div
                  className={`mt-6 flex justify-center transition-opacity duration-200 ${firstName.trim().length > 0 ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                  <button
                    type="submit"
                    className="cursor-pointer rounded-full bg-[#FF9500] px-6 py-2 text-sm font-bold text-white transition-all hover:bg-[#FF9500]/85"
                  >
                    Ok
                  </button>
                </div>
              </motion.form>
            )}

            {step === "email" && (
              <motion.form
                key="email"
                initial={{ opacity: 0, y: direction * 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleTextSubmit}
              >
                <div className="mb-2 flex items-start justify-center gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FF9500] text-xs font-bold text-white">
                    {stepNumber("email")}
                  </span>
                  <label
                    htmlFor="email"
                    className="text-xl font-semibold text-black"
                  >
                    What&apos;s your email?<span className="text-[#FF9500]">*</span>
                  </label>
                </div>
                <p className="mb-6 text-center text-xs text-black/40">
                  No spam, no mailing lists.
                </p>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="off"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="Type your answer here..."
                  className="mt-6 w-full border-b-2 border-black/10 bg-transparent pb-2 text-lg text-black placeholder:text-black/25 focus:border-[#FF9500] focus:outline-none"
                />
                {error && step === "email" && (
                  <p className="mt-2 text-xs text-red-500">{error}</p>
                )}
                <div
                  className={`mt-6 flex justify-center transition-opacity duration-200 ${email.trim().length > 0 ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                  <button
                    type="submit"
                    className="cursor-pointer rounded-full bg-[#FF9500] px-6 py-2 text-sm font-bold text-white transition-all hover:bg-[#FF9500]/85"
                  >
                    Ok
                  </button>
                </div>
              </motion.form>
            )}

            {step === "hasApp" && (
              <motion.div
                key="hasApp"
                initial={{ opacity: 0, y: direction * 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6 flex items-start justify-center gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FF9500] text-xs font-bold text-white">
                    {stepNumber("hasApp")}
                  </span>
                  <p className="text-xl font-semibold text-black">
                    Do you already have an app on the App Store?<span className="text-[#FF9500]">*</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {APP_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.value}
                      onClick={() => handleAppSelect(opt.value)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-5 py-3.5 text-left text-sm font-medium text-black transition-all hover:border-[#FF9500]/40 hover:bg-[#FF9500]/5 active:scale-[0.98]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/10 text-[11px] font-bold uppercase text-black/40">{String.fromCharCode(97 + i)}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "revenue" && (
              <motion.div
                key="revenue"
                initial={{ opacity: 0, y: direction * 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6 flex items-start justify-center gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FF9500] text-xs font-bold text-white">
                    {stepNumber("revenue")}
                  </span>
                  <p className="text-xl font-semibold text-black">
                    What&apos;s your app&apos;s MRR right now?<span className="text-[#FF9500]">*</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {REVENUE_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.value}
                      onClick={() => handleRevenueSelect(opt.value)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-5 py-3.5 text-left text-sm font-medium text-black transition-all hover:border-[#FF9500]/40 hover:bg-[#FF9500]/5 active:scale-[0.98]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/10 text-[11px] font-bold uppercase text-black/40">{String.fromCharCode(97 + i)}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "challenge" && (
              <motion.form
                key="challenge"
                initial={{ opacity: 0, y: direction * 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleTextSubmit}
              >
                <div className="mb-2 flex items-start justify-center gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FF9500] text-xs font-bold text-white">
                    {stepNumber("challenge")}
                  </span>
                  <label
                    htmlFor="challenge"
                    className="text-xl font-semibold text-black"
                  >
                    What&apos;s your biggest challenge right now?<span className="text-[#FF9500]">*</span>
                  </label>
                </div>
                <p className="mb-6 text-center text-xs text-black/40">
                  We ask this to make sure we can actually help with your
                  specific situation.
                </p>
                <textarea
                  id="challenge"
                  autoFocus
                  autoComplete="off"
                  rows={3}
                  value={challenge}
                  onChange={(e) => { setChallenge(e.target.value); setError(""); }}
                  placeholder="Type your answer here..."
                  className="w-full resize-none border-b-2 border-black/10 bg-transparent pb-2 text-lg text-black placeholder:text-black/25 focus:border-[#FF9500] focus:outline-none"
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span
                    className={
                      challengeMet ? "text-emerald-600" : "text-black/40"
                    }
                  >
                    {challengeCount}/{CHALLENGE_MIN_CHARS} min
                  </span>
                  {error && step === "challenge" && (
                    <span className="text-red-500">{error}</span>
                  )}
                </div>
                <div
                  className={`mt-6 flex justify-center transition-opacity duration-200 ${challengeMet ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                  <button
                    type="submit"
                    className="cursor-pointer rounded-full bg-[#FF9500] px-6 py-2 text-sm font-bold text-white transition-all hover:bg-[#FF9500]/85"
                  >
                    Ok
                  </button>
                </div>
              </motion.form>
            )}

            {step === "businessType" && (
              <motion.div
                key="businessType"
                initial={{ opacity: 0, y: direction * 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6 flex items-start justify-center gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FF9500] text-xs font-bold text-white">
                    {stepNumber("businessType")}
                  </span>
                  <p className="text-xl font-semibold text-black">
                    Are you applying as an individual or a business?<span className="text-[#FF9500]">*</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {BUSINESS_TYPE_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.value}
                      disabled={submitting}
                      onClick={() => handleBusinessTypeSelect(opt.value)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-5 py-3.5 text-left text-sm font-medium text-black transition-all hover:border-[#FF9500]/40 hover:bg-[#FF9500]/5 active:scale-[0.98] disabled:cursor-default disabled:opacity-50"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/10 text-[11px] font-bold uppercase text-black/40">{String.fromCharCode(97 + i)}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "budget" && (
              <motion.div
                key="budget"
                initial={{ opacity: 0, y: direction * 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-2 flex items-start justify-center gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FF9500] text-xs font-bold text-white">
                    {stepNumber("budget")}
                  </span>
                  <p className="text-xl font-semibold text-black">
                    AppSprint programs start at $2,000. What&apos;s your budget
                    to invest in growth over the next 90 days?<span className="text-[#FF9500]">*</span>
                  </p>
                </div>
                <p className="mb-6 text-center text-xs text-black/40">
                  We ask this to make sure we can actually help with your
                  specific situation.
                </p>
                <div className="flex flex-col gap-2.5">
                  {BUDGET_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.value}
                      disabled={submitting}
                      onClick={() => handleBudgetSelect(opt.value)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-5 py-3.5 text-left text-sm font-medium text-black transition-all hover:border-[#FF9500]/40 hover:bg-[#FF9500]/5 active:scale-[0.98] disabled:cursor-default disabled:opacity-50"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/10 text-[11px] font-bold uppercase text-black/40">{String.fromCharCode(97 + i)}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>

        {/* Navigation arrows */}
        <div className="absolute bottom-6 right-8 flex overflow-hidden rounded-full border border-black/10 sm:right-12">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoBack}
            aria-label="Previous question"
            className="flex h-7 w-9 cursor-pointer items-center justify-center border-r border-black/10 bg-[#FF9500] text-white transition-colors hover:bg-[#FF9500]/85 disabled:cursor-default disabled:bg-transparent disabled:text-black/25"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoForward}
            aria-label="Next question"
            className="flex h-7 w-9 cursor-pointer items-center justify-center bg-[#FF9500] text-white transition-colors hover:bg-[#FF9500]/85 disabled:cursor-default disabled:bg-transparent disabled:text-black/25"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirmation step (cal.com inline embed) ────────────────────────

function buildBookingNotes(args: {
  hasApp: string;
  revenue: string;
  challenge: string;
  businessType: string;
  budget: string;
}) {
  const lines: string[] = [];
  if (args.hasApp) lines.push(`Has app: ${HAS_APP_LABEL[args.hasApp] ?? args.hasApp}`);
  if (args.revenue) lines.push(`MRR: ${REVENUE_LABEL[args.revenue] ?? args.revenue}`);
  if (args.businessType) lines.push(`Business type: ${BUSINESS_TYPE_LABEL[args.businessType] ?? args.businessType}`);
  if (args.budget) lines.push(`Budget: ${BUDGET_LABEL[args.budget] ?? args.budget}`);
  if (args.challenge) lines.push(`Biggest challenge: ${args.challenge}`);
  return lines.join("\n");
}

function CalConfirmation({
  firstName,
  email,
  hasApp,
  revenue,
  challenge,
  businessType,
  budget,
}: {
  firstName: string;
  email: string;
  hasApp: string;
  revenue: string;
  challenge: string;
  businessType: string;
  budget: string;
}) {
  const router = useRouter();

  const notes = buildBookingNotes({ hasApp, revenue, challenge, businessType, budget });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cal = await getCalApi();
      if (cancelled) return;
      cal("ui", {
        theme: "light",
        cssVarsPerTheme: {
          light: { "cal-brand": "#FF9500" },
          dark: { "cal-brand": "#FF9500" },
        },
        hideEventTypeDetails: false,
      });
      cal("on", {
        action: "bookingSuccessful",
        callback: () => {
          const visitorId = getVisitorId();
          const sessionId = getSessionId("quiz");
          fire("quiz", "quiz_booked", visitorId, sessionId);
          fetch("/api/join/booked", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName,
              email,
              hasApp,
              revenue: revenue || undefined,
              challenge: challenge || undefined,
              businessType,
              budget,
            }),
          }).catch(() => {});
          try {
            sessionStorage.setItem("join_booked_first_name", firstName);
          } catch {}
          router.push("/join/booking-confirmed");
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [firstName, email, hasApp, revenue, challenge, businessType, budget, router]);

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-start px-6 pt-32 pb-12 sm:pt-40"
    >
      <PageTracker product="quiz" />
      <div className="w-full max-w-5xl">
        <div className="px-2 text-center">
          <p className="text-4xl font-bold leading-tight tracking-tight text-black sm:text-6xl">
            Thanks, {firstName || "there"}. 🎯
          </p>
          <p className="mt-4 text-lg text-black/70 sm:text-xl">
            Pick a time and let&apos;s talk about your app.
          </p>
        </div>

        <div className="mt-6">
          <Cal
            calLink={CAL_LINK}
            config={{
              name: firstName,
              email,
              notes,
              theme: "light",
              layout: "month_view",
            }}
            style={{ width: "100%" }}
          />
        </div>

        <p className="mt-6 text-center text-sm text-black/60">
          Talk soon.
          <br />
          — Arthur
        </p>
      </div>
    </div>
  );
}
