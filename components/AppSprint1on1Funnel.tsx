"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Youtube, Users, Calendar, ExternalLink } from "lucide-react";
import AnalyticsTracker from "./AnalyticsTracker";

// ─── Types ──────────────────────────────────────────────────────────
type Step =
    | "hero"
    | "q1"
    | "q2"
    | "q3"
    | "q4"
    | "q5"
    | "q6"
    | "result-youtube"
    | "result-community"
    | "result-not-ready"
    | "result-booking";

interface AnswerOption {
    emoji: string;
    label: string;
    next: Step;
}

// ─── Question Data ──────────────────────────────────────────────────
type QuestionKey = "q1" | "q2" | "q3" | "q4" | "q5" | "q6";

const questions: Record<
    QuestionKey,
    { title: string; subtitle: string; answers: AnswerOption[] }
> = {
    q1: {
        title: "What is your primary goal right now?",
        subtitle: "Be honest, it helps us point you to the right path.",
        answers: [
            {
                emoji: "🌱",
                label: "I want to learn the basics and explore mobile dev.",
                next: "result-community",
            },
            {
                emoji: "🚀",
                label: "I have an app idea/prototype and I want to launch and get revenue ASAP.",
                next: "q2",
            },
            {
                emoji: "🐛",
                label: "I'm just looking for free technical advice on a bug.",
                next: "result-youtube",
            },
        ],
    },
    q2: {
        title: "Where are you with your app right now?",
        subtitle: "This helps us understand if 1:1 is the right format for you.",
        answers: [
            {
                emoji: "💭",
                label: "Just an idea, I haven't started building yet.",
                next: "q3",
            },
            {
                emoji: "🛠️",
                label: "I have a prototype or MVP in progress.",
                next: "q3",
            },
            {
                emoji: "📱",
                label: "My app is live, I want to scale and grow revenue.",
                next: "q3",
            },
            {
                emoji: "🤷",
                label: "I don't have an app idea yet.",
                next: "result-community",
            },
        ],
    },
    q3: {
        title: "How soon do you want to launch or hit your next milestone?",
        subtitle: "The 1:1 Sprint is built for speed.",
        answers: [
            {
                emoji: "⚡",
                label: "Within the next 30 days, I'm all in.",
                next: "q4",
            },
            {
                emoji: "📅",
                label: "Within 2-3 months.",
                next: "q4",
            },
            {
                emoji: "🐌",
                label: "No rush, I'll get to it eventually.",
                next: "result-community",
            },
        ],
    },
    q4: {
        title:
            "Real talk: This 1:1 Mentorship is a high-level investment of both time and capital. Are you in a position to invest in your business right now?",
        subtitle: "No wrong answers, we have something for every stage.",
        answers: [
            {
                emoji: "💰",
                label: "Yes, I have a budget set aside for coaching and tools.",
                next: "q5",
            },
            {
                emoji: "🆓",
                label: "No, I am bootstrapping with €0 budget right now.",
                next: "result-youtube",
            },
            {
                emoji: "💸",
                label: "I have a small budget (around €100/mo).",
                next: "result-community",
            },
        ],
    },
    q5: {
        title: "What monthly budget do you have in mind for the mentorship?",
        subtitle: "This helps us prepare the right plan for your call.",
        answers: [
            {
                emoji: "🟢",
                label: "€750 - €1,000",
                next: "q6",
            },
            {
                emoji: "🟡",
                label: "€1,000 - €1,500",
                next: "q6",
            },
            {
                emoji: "🟠",
                label: "€1,500 - €2,000",
                next: "q6",
            },
            {
                emoji: "🔵",
                label: "€2,000+",
                next: "q6",
            },
        ],
    },
    q6: {
        title:
            "This program requires execution. We review code and strategy, but YOU have to build it. Are you ready to dedicate 5-10 hours a week to this?",
        subtitle: "This is what separates dreamers from builders.",
        answers: [
            {
                emoji: "🙋",
                label: "I'm busy, I need someone to build it for me.",
                next: "result-not-ready",
            },
            {
                emoji: "🔥",
                label: "I'm ready to do the work.",
                next: "result-booking",
            },
        ],
    },
};

const questionOrder: QuestionKey[] = ["q1", "q2", "q3", "q4", "q5", "q6"];

// ─── Animation Variants ─────────────────────────────────────────────
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

// ─── Main Component ─────────────────────────────────────────────────
const AppSprint1on1Funnel = () => {
    const [step, setStep] = useState<Step>("hero");
    const [direction, setDirection] = useState(1);
    const [budgetRange, setBudgetRange] = useState("");

    const goTo = (next: Step) => {
        setDirection(1);
        setStep(next);
    };

    const goBack = () => {
        setDirection(-1);
        if (step === "q1") setStep("hero");
        else if (step === "q2") setStep("q1");
        else if (step === "q3") setStep("q2");
        else if (step === "q4") setStep("q3");
        else if (step === "q5") setStep("q4");
        else if (step === "q6") setStep("q5");
    };

    const restart = () => {
        setDirection(-1);
        setBudgetRange("");
        setStep("hero");
    };

    const currentQuestionIndex = questionOrder.indexOf(step as QuestionKey);
    const isQuestion = step.startsWith("q");

    return (
        <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] font-sans selection:bg-[#f4cf8f]/30 relative overflow-hidden">
            <AnalyticsTracker />

            {/* Background glow */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#f4cf8f]/[0.03] blur-[120px]" />

            {/* Progress bar */}
            {isQuestion && (
                <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/5">
                    <motion.div
                        className="h-full bg-[#f4cf8f]"
                        initial={{ width: "0%" }}
                        animate={{
                            width: `${((currentQuestionIndex + 1) / questionOrder.length) * 100}%`,
                        }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                </div>
            )}

            {/* Back button */}
            {isQuestion && (
                <button
                    onClick={goBack}
                    className="fixed top-6 left-6 z-50 flex items-center gap-1.5 text-sm text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
            )}

            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={step}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="flex min-h-screen items-center justify-center px-6 py-16"
                >
                    {/* ═══ HERO ═══ */}
                    {step === "hero" && <HeroScreen onStart={() => goTo("q1")} />}

                    {/* ═══ QUESTIONS ═══ */}
                    {(step === "q1" || step === "q2" || step === "q3" || step === "q4" || step === "q5" || step === "q6") && (
                        <QuestionScreen
                            question={questions[step]}
                            onAnswer={(next, answerLabel) => {
                                if (step === "q5") setBudgetRange(answerLabel);
                                goTo(next);
                            }}
                            stepKey={step}
                            questionNumber={currentQuestionIndex + 1}
                            totalQuestions={questionOrder.length}
                        />
                    )}

                    {/* ═══ RESULTS ═══ */}
                    {step === "result-youtube" && <ResultYoutube onRestart={restart} />}
                    {step === "result-community" && <ResultCommunity onRestart={restart} />}
                    {step === "result-not-ready" && <ResultNotReady onRestart={restart} />}
                    {step === "result-booking" && <ResultBooking budgetRange={budgetRange} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

// ─── Hero Screen ─────────────────────────────────────────────────────
const HeroScreen = ({ onStart }: { onStart: () => void }) => (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <a
                href="https://www.youtube.com/@ArthurBuildsStuff"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-6 flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            >
                <img
                    src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
                    alt="ArthurBuildsStuff"
                    className="h-8 w-8 rounded-full border border-[#f4cf8f]/20"
                />
                <span className="text-sm font-medium text-[#c9c4bc]">By ArthurBuildsStuff</span>
            </a>
        </motion.div>

        <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-serif text-5xl font-bold tracking-tight leading-[1.1] sm:text-6xl md:text-7xl"
        >
            Launch your app{" "}
            <span className="relative inline-block text-[#f4cf8f]">
                with me
                <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0 5 Q 50 10 100 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className="text-[#f4cf8f]/50"
                    />
                </svg>
            </span>
        </motion.h1>

        <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-lg text-[#c9c4bc] sm:text-xl max-w-xl leading-relaxed"
        >
            Personalized coaching, code reviews, and strategy to take your
            app from idea to revenue.
        </motion.p>

        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10"
        >
            <button
                onClick={onStart}
                data-fast-goal="1on1_hero_start_quiz"
                className="group flex h-14 items-center gap-3 rounded-full bg-[#f4cf8f] px-10 text-lg font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-8 hover:ring-[#f4cf8f]/10 cursor-pointer shadow-lg shadow-[#f4cf8f]/10"
            >
                See if you qualify
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
        </motion.div>

        <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-sm text-[#c9c4bc]/60"
        >
            6 quick questions · Takes 30 seconds
        </motion.p>
    </div>
);

// ─── Question Screen ─────────────────────────────────────────────────
const QuestionScreen = ({
    question,
    onAnswer,
    stepKey,
    questionNumber,
    totalQuestions,
}: {
    question: (typeof questions)["q1"];
    onAnswer: (next: Step, answerLabel: string) => void;
    stepKey: string;
    questionNumber: number;
    totalQuestions: number;
}) => (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto w-full">
        <h2 className="font-serif text-3xl font-bold tracking-tight leading-tight sm:text-4xl mb-3">
            {question.title}
        </h2>

        <p className="text-[#c9c4bc] mb-10 text-base">{question.subtitle}</p>

        <div className="flex flex-col gap-4 w-full max-w-xl">
            {question.answers.map((answer, i) => (
                <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    onClick={() => onAnswer(answer.next, answer.label)}
                    data-fast-goal={`1on1_${stepKey}_answer_${i + 1}`}
                    className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-left transition-all hover:bg-white/10 hover:border-[#f4cf8f]/30 hover:ring-2 hover:ring-[#f4cf8f]/10 cursor-pointer"
                >
                    <span className="text-2xl shrink-0">{answer.emoji}</span>
                    <span className="text-[#f1ebe2] text-base font-medium leading-snug">
                        {answer.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#c9c4bc] shrink-0 ml-auto opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </motion.button>
            ))}
        </div>
    </div>
);

// ─── Result: YouTube / Free Resources ────────────────────────────────
const ResultYoutube = ({ onRestart }: { onRestart: () => void }) => (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            You&apos;re in the right place, just a different lane 🎯
        </h2>

        <p className="text-[#c9c4bc] text-lg leading-relaxed mb-4 max-w-lg">
            The 1:1 mentorship is for builders ready to invest and ship fast. But you&apos;re not left out.
        </p>

        <p className="text-[#c9c4bc] text-base leading-relaxed mb-10 max-w-lg">
            My YouTube channel has free tutorials and real-world app breakdowns to get you started. When you&apos;re ready to go all in, I&apos;ll be here.
        </p>

        <a
            href="https://www.youtube.com/@ArthurBuildsStuff"
            target="_blank"
            rel="noopener noreferrer"
            data-fast-goal="1on1_result_youtube_clicked"
            className="group flex h-14 items-center gap-3 rounded-full bg-red-500 px-10 text-lg font-bold text-white transition-all hover:bg-red-500/90 hover:ring-8 hover:ring-red-500/10 cursor-pointer shadow-lg shadow-red-500/10"
        >
            <Youtube className="h-5 w-5" />
            Watch free on YouTube
            <ExternalLink className="h-4 w-4 opacity-60" />
        </a>

        <button
            onClick={onRestart}
            className="mt-6 text-sm text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors cursor-pointer underline underline-offset-4 decoration-[#c9c4bc]/30"
        >
            ← Start over
        </button>
    </div>
);

// ─── Result: Community Downsell ──────────────────────────────────────
const ResultCommunity = ({ onRestart }: { onRestart: () => void }) => (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            It looks like the 1:1 Sprint might be overkill for you right now 💡
        </h2>

        <p className="text-[#c9c4bc] text-lg leading-relaxed mb-4 max-w-lg">
            You&apos;re in the perfect spot for our{" "}
            <strong className="text-[#f1ebe2]">Builders Community</strong>. Course materials
            and group calls included, perfect for your current stage.
        </p>

        <a
            href="/app-sprint"
            data-fast-goal="1on1_result_community_clicked"
            className="group flex h-14 items-center gap-3 rounded-full bg-[#f4cf8f] px-10 text-lg font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-8 hover:ring-[#f4cf8f]/10 cursor-pointer shadow-lg shadow-[#f4cf8f]/10"
        >
            Join the private community
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </a>

        <button
            onClick={onRestart}
            className="mt-6 text-sm text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors cursor-pointer underline underline-offset-4 decoration-[#c9c4bc]/30"
        >
            ← Start over
        </button>
    </div>
);

// ─── Result: Not Ready (was Agency Referral) ─────────────────────────
const ResultNotReady = ({ onRestart }: { onRestart: () => void }) => (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            This program might not be the right fit yet ⏳
        </h2>

        <p className="text-[#c9c4bc] text-lg leading-relaxed mb-4 max-w-lg">
            The 1:1 Sprint is for hands-on founders. We review code
            and strategy together, but <strong className="text-[#f1ebe2]">you</strong>{" "}
            build it.
        </p>

        <p className="text-[#c9c4bc] text-base leading-relaxed mb-10 max-w-lg">
            If your situation changes, the community is a great place to start
            learning and building at your own pace.
        </p>

        <a
            href="/app-sprint"
            data-fast-goal="1on1_result_not_ready_clicked"
            className="group flex h-14 items-center gap-3 rounded-full bg-[#f4cf8f] px-10 text-lg font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-8 hover:ring-[#f4cf8f]/10 cursor-pointer shadow-lg shadow-[#f4cf8f]/10"
        >
            Join the private community
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </a>

        <button
            onClick={onRestart}
            className="mt-6 text-sm text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors cursor-pointer underline underline-offset-4 decoration-[#c9c4bc]/30"
        >
            ← Start over
        </button>
    </div>
);

// ─── Result: Booking (Success!) ──────────────────────────────────────
const ResultBooking = ({ budgetRange }: { budgetRange: string }) => {
    // Budget codes: P1=€750-1000, P2=€1000-1500, P3=€1500-2000, P4=€2000+
    const budgetCodes: Record<string, string> = {
        "€750 - €1,000": "P1",
        "€1,000 - €1,500": "P2",
        "€1,500 - €2,000": "P3",
        "€2,000+": "P4",
    };
    const code = budgetCodes[budgetRange] || "";
    const calUrl = code
        ? `https://cal.com/arthur-builds-stuff/app-sprint-application?utm_notes=${encodeURIComponent(code)}`
        : "https://cal.com/arthur-builds-stuff/app-sprint-application";

    return (
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <span className="inline-flex items-center gap-2 rounded-full border border-[#f4cf8f]/20 bg-[#f4cf8f]/5 px-4 py-1.5 text-sm font-medium text-[#f4cf8f] mb-6">
                    <Sparkles className="h-3.5 w-3.5" />
                    You qualify!
                </span>
            </motion.div>

            <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-4"
            >
                You&apos;re exactly who this is built for 🎉
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[#c9c4bc] text-lg leading-relaxed mb-4 max-w-lg"
            >
                You have the goal, the budget, and the commitment. Let&apos;s map out
                your app launch strategy together.
            </motion.p>

            <motion.a
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                href={calUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-fast-goal="1on1_result_booking_clicked"
                className="group flex h-14 items-center gap-3 rounded-full bg-[#f4cf8f] px-10 text-lg font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-8 hover:ring-[#f4cf8f]/10 cursor-pointer shadow-lg shadow-[#f4cf8f]/10"
            >
                <Calendar className="h-5 w-5" />
                Book your free call
                <ExternalLink className="h-4 w-4 opacity-60" />
            </motion.a>
        </div>
    );
};

export default AppSprint1on1Funnel;
