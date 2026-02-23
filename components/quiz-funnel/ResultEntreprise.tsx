"use client";

import { motion } from "framer-motion";
import { Calendar, ExternalLink, CheckCircle, Sparkles } from "lucide-react";
import { getBlockageLabel } from "./quizData";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const CAL_URL =
  "https://cal.com/arthur-builds-stuff/app-sprint-strategy";

const BENEFITS = [
  {
    title: "Production-ready boilerplate",
    desc: "No need to hire a mobile dev. Payments, analytics, attribution — everything is wired up.",
  },
  {
    title: "Weekly 1:1 calls with me",
    desc: "Business strategy, code review, monetization, acquisition. We move forward together.",
  },
  {
    title: "Focus on ROI and speed of execution",
    desc: "90 days instead of 6 months. We build a profitable product, not a side project.",
  },
  {
    title: "Business strategy and positioning",
    desc: "We define the right pricing, the right market, and the right acquisition strategy.",
  },
  {
    title: "Complete video course + boilerplate",
    desc: "From ideation to scaling — the entire process, step by step.",
  },
  {
    title: "Results guarantee",
    desc: "If you don't have a live MVP in 90 days, I keep working with you for free.",
  },
];

const TIMELINE = [
  { step: "Week 1-2", title: "Audit & Strategy", desc: "We analyze your market, your competition, and define the perfect MVP." },
  { step: "Week 3-4", title: "Architecture & Development", desc: "We build the technical foundations with an architecture that scales." },
  { step: "Week 5-8", title: "MVP & Validation", desc: "We launch the MVP, validate with real users, and iterate." },
  { step: "Week 9-12", title: "Monetization & Launch", desc: "We implement monetization, onboarding, and officially launch." },
];


export default function ResultEntreprise({
  firstName,
  answers,
}: {
  firstName: string;
  answers: Record<string, number>;
}) {
  const blocker = getBlockageLabel(answers.q4 ?? 0);
  const displayName = firstName || "you";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <motion.div {...fadeInUp} className="text-center mb-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#f4cf8f]/20 bg-[#f4cf8f]/5 px-4 py-1.5 text-sm font-medium text-[#f4cf8f] mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Entrepreneur Ready to Scale
        </span>

        <h1 className="font-serif text-4xl font-bold tracking-tight leading-tight sm:text-5xl mb-4">
          Congratulations {displayName}!
        </h1>

        <p className="text-[#c9c4bc] text-lg leading-relaxed max-w-xl mx-auto">
          You already have a running business. A mobile app is the obvious growth lever,
          but you don&apos;t want to waste 6 months and $20K with an agency. You want to move fast,
          do it right, and stay in control. Your main blocker: {blocker}.
        </p>
      </motion.div>

      {/* VSL Placeholder */}
      <motion.div {...fadeInUp} className="mb-12">
        <div className="aspect-video bg-[#3a3735] rounded-2xl flex items-center justify-center border border-white/5">
          <span className="text-[#c9c4bc]/50 text-sm">Presentation video</span>
        </div>
      </motion.div>

      {/* Explanation */}
      <motion.div {...fadeInUp} className="mb-12">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Why this program is built for you
        </h2>
        <p className="text-[#c9c4bc] leading-relaxed mb-4">
          You&apos;re an entrepreneur who wants to launch a mobile product for your business.
          You need to move fast, make the right technical choices from day one,
          and have a clear monetization strategy.
        </p>
        <p className="text-[#c9c4bc] leading-relaxed">
          The Enterprise program is an intensive 3-month mentorship with
          a business focus: ROI, speed of execution, and scaling. We build
          a profitable product together in 90 days.
        </p>
      </motion.div>

      {/* Benefits */}
      <motion.div {...fadeInUp} className="mb-12">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-6">
          What you get with App Sprint
        </h2>
        <div className="space-y-4">
          {BENEFITS.map((b, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-[#f4cf8f] shrink-0 mt-1" />
              <div>
                <span className="text-[#f1ebe2] font-medium">{b.title}</span>
                <p className="text-sm text-[#c9c4bc] mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA #1 */}
      <motion.div {...fadeInUp} className="text-center mb-16">
        <a
          href={CAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-fast-goal="quiz_result_entreprise_cta"
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
          Book your free strategy call (20 min)
          <ExternalLink className="h-4 w-4 opacity-60" />
        </a>
        <p className="mt-3 text-sm text-[#c9c4bc]/60">
          Let&apos;s analyze together if a mobile app can accelerate your business.
        </p>
      </motion.div>

      {/* How it works - Timeline */}
      <motion.div {...fadeInUp} className="mb-16">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-8 text-center">
          The program in 4 phases
        </h2>
        <div className="space-y-6 relative">
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-white/10" />
          {TIMELINE.map((item, i) => (
            <div key={i} className="flex gap-4 relative">
              <div className="h-9 w-9 shrink-0 rounded-full bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 flex items-center justify-center text-sm font-bold text-[#f4cf8f] z-10">
                {i + 1}
              </div>
              <div>
                <span className="text-xs font-medium text-[#f4cf8f] uppercase tracking-wider">
                  {item.step}
                </span>
                <h3 className="text-[#f1ebe2] font-bold mt-0.5">{item.title}</h3>
                <p className="text-sm text-[#c9c4bc] mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* About Arthur */}
      <motion.div {...fadeInUp} className="mb-16">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-center">
          Who is Arthur?
        </h2>
        <div className="flex flex-col items-center text-center">
          <img
            src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
            alt="Arthur"
            className="h-20 w-20 rounded-full border border-white/10 mb-4"
          />
          <p className="text-[#c9c4bc] leading-relaxed max-w-lg">
            Indie mobile developer with 3 published apps.
            Creator of the YouTube channel ArthurBuildsStuff (40+ devs mentored).
            I help entrepreneurs launch profitable mobile products, fast.
          </p>
        </div>
      </motion.div>

      {/* More social proof */}
      <motion.div {...fadeInUp} className="mb-16 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#c9c4bc]">
          <span>🏢 Startups mentored</span>
          <span>⭐ 5/5 satisfaction</span>
          <span>⚡ 90 days to launch</span>
          <span>💰 Fast ROI</span>
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.div {...fadeInUp} className="text-center pb-12">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Ready to launch your mobile product?
        </h2>
        <p className="text-[#c9c4bc] mb-6 max-w-md mx-auto">
          Book a free 20-minute strategy call. We&apos;ll talk about your business,
          your goals, and I&apos;ll show you how we can launch in 90 days.
        </p>
        <a
          href={CAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-fast-goal="quiz_result_entreprise_cta_final"
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
          Book your free strategy call
          <ExternalLink className="h-4 w-4 opacity-60" />
        </a>
      </motion.div>
    </div>
  );
}
