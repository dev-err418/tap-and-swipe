"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, LoaderCircle } from "lucide-react";
import PageTracker, {
  getVisitorId,
  getSessionId,
  getRef,
  fire,
} from "@/components/PageTracker";

// ── Step definitions ────────────────────────────────────────────────

type StepId = "firstName" | "email" | "hasApp" | "challenge" | "budget";

const APP_OPTIONS = [
  { value: "revenue", label: "Yes, and I'm making revenue" },
  { value: "no-revenue", label: "Yes, but no revenue yet" },
  { value: "idea", label: "No, but I have an idea" },
  { value: "scratch", label: "No, I'm starting from scratch" },
] as const;

const BUDGET_OPTIONS = [
  { value: "under-500", label: "Under $500" },
  { value: "500-2000", label: "$500 - $2,000" },
  { value: "2000-3000", label: "$2,000 - $3,000" },
  { value: "4000-5000", label: "$4,000 - $5,000" },
  { value: "5000-plus", label: "$5,000+" },
] as const;

const STEPS: StepId[] = ["firstName", "email", "hasApp", "challenge", "budget"];

// ── Helpers ─────────────────────────────────────────────────────────

/** Check whether a step has been answered */
function isStepAnswered(
  stepId: StepId,
  state: { firstName: string; email: string; hasApp: string; challenge: string },
) {
  switch (stepId) {
    case "firstName":
      return state.firstName.trim().length > 0;
    case "email":
      return state.email.trim().length > 0;
    case "hasApp":
      return state.hasApp.length > 0;
    case "challenge":
      return state.challenge.trim().length > 0;
    case "budget":
      return false; // terminal step
  }
}

// ── Component ───────────────────────────────────────────────────────

export default function JoinClient() {
  const router = useRouter();
  // Restore saved state from sessionStorage
  const saved = typeof window !== "undefined"
    ? (() => { try { return JSON.parse(sessionStorage.getItem("join_quiz") || "{}"); } catch { return {}; } })()
    : {};

  const [step, setStep] = useState<StepId>("firstName");
  const debugLoading = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("loading");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(debugLoading);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Form state
  const [firstName, setFirstName] = useState(saved.firstName || "");
  const [email, setEmail] = useState(saved.email || "");
  const [hasApp, setHasApp] = useState(saved.hasApp || "");
  const [challenge, setChallenge] = useState(saved.challenge || "");
  const [error, setError] = useState("");

  const stepIndex = STEPS.indexOf(step);
  const formState = { firstName, email, hasApp, challenge };

  // Persist answers to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      "join_quiz",
      JSON.stringify({ step, firstName, email, hasApp, challenge }),
    );
  }, [step, firstName, email, hasApp, challenge]);

  // ── Navigation ──────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (stepIndex >= STEPS.length - 1) return;
    if (!isStepAnswered(step, formState)) {
      setError("Please fill in this field");
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
    setStep(STEPS[stepIndex + 1]);
  }, [step, stepIndex, formState]);

  const goPrev = useCallback(() => {
    if (stepIndex <= 0) return;
    setError("");
    setDirection(-1);
    setStep(STEPS[stepIndex - 1]);
  }, [stepIndex]);

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
      setStep("challenge");
    },
    [],
  );

  const handleBudgetSelect = useCallback(
    async (budget: string) => {
      if (submitting) return;
      setSubmitting(true);

      const highTicket = ["2000-3000", "4000-5000", "5000-plus"].includes(budget);
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
            challenge: challenge.trim() || undefined,
            budget,
            route,
            ref: ref || undefined,
          }),
        });
      } catch {}

      setLoading(true);
      sessionStorage.removeItem("join_quiz");
      await new Promise((r) => setTimeout(r, 2000));

      if (highTicket) {
        window.location.href = "https://cal.com/arthur-builds-stuff/app-sprint-application";
      } else {
        router.push("/community");
      }
    },
    [firstName, email, hasApp, challenge, submitting, router],
  );

  // Keyboard arrows + number keys for multi-choice
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
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
        if (step === "budget" && idx < BUDGET_OPTIONS.length && !submitting) {
          e.preventDefault();
          handleBudgetSelect(BUDGET_OPTIONS[idx].value);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, step, submitting, handleAppSelect, handleBudgetSelect]);

  // ── Current step value (for showing/hiding Ok button) ───────────

  const currentHasValue =
    (step === "firstName" && firstName.trim().length > 0) ||
    (step === "email" && email.trim().length > 0) ||
    (step === "challenge"); // always show continue for optional field

  const canGoBack = stepIndex > 0;
  const isMultiChoice = step === "hasApp" || step === "budget";
  const canGoForward =
    !isMultiChoice &&
    stepIndex < STEPS.length - 1 &&
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

  return (
    <div
      className="-mt-[var(--navbar-h)] flex h-dvh flex-col items-center justify-center px-6"
      style={{ "--navbar-h": "68px" } as React.CSSProperties}
    >
      <PageTracker product="quiz" />

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
        {/* Progress bar */}
        <div className="h-1 w-full bg-black/5">
          <motion.div
            className="h-full bg-[#FF9500]"
            initial={false}
            animate={{
              width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Logo + Steps */}
        <div className="flex h-[500px] flex-col overflow-y-auto px-8 pb-20 pt-8 sm:px-12 sm:pt-10">
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
                <div className="mb-2 flex items-start justify-center gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FF9500] text-xs font-bold text-white">
                    1
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
                    2
                  </span>
                  <label
                    htmlFor="email"
                    className="text-xl font-semibold text-black"
                  >
                    What&apos;s your email?<span className="text-[#FF9500]">*</span>
                  </label>
                </div>
                <p className="mb-4 text-center text-xs text-black/40">
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
                <div className="mb-2 flex items-start justify-center gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FF9500] text-xs font-bold text-white">
                    3
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
                    4
                  </span>
                  <label
                    htmlFor="challenge"
                    className="text-xl font-semibold text-black"
                  >
                    What&apos;s your biggest challenge right now?<span className="text-[#FF9500]">*</span>
                  </label>
                </div>
                <p className="mb-4 text-center text-xs text-black/40">
                  We ask this to make sure we can actually help with your
                  specific situation.
                </p>
                <input
                  id="challenge"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={challenge}
                  onChange={(e) => { setChallenge(e.target.value); setError(""); }}
                  placeholder="Type your answer here..."
                  className="w-full border-b-2 border-black/10 bg-transparent pb-2 text-lg text-black placeholder:text-black/25 focus:border-[#FF9500] focus:outline-none"
                />
                <div className="mt-6 flex justify-center">
                  <button
                    type="submit"
                    className="cursor-pointer rounded-full bg-[#FF9500] px-6 py-2 text-sm font-bold text-white transition-all hover:bg-[#FF9500]/85"
                  >
                    Ok
                  </button>
                </div>
              </motion.form>
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
                    5
                  </span>
                  <p className="text-xl font-semibold text-black">
                    What&apos;s your budget to invest in growing your app
                    business?<span className="text-[#FF9500]">*</span>
                  </p>
                </div>
                <p className="mb-4 text-center text-xs text-black/40">
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
