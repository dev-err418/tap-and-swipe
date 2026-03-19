"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getNeedLabel } from "./quizData";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const CAL_BASE = "https://cal.com/arthur-builds-stuff/app-sprint-application";

// ─── Q3-based recommendation copy ──────────────────────────────────

interface RecommendationCopy {
  tagline: string;
  body: string;
}

function getRecommendation(q3Index: number): RecommendationCopy {
  switch (q3Index) {
    case 0: // Strategy
      return {
        tagline: "You need a clear roadmap before writing a single line of code.",
        body: "Many app projects fail not because of bad code, but because of bad planning. I'll help you define the right scope, pick the right tech stack, and build a strategy that makes sense for your business so you don't waste months going in the wrong direction.",
      };
    case 1: // Development
      return {
        tagline: "You know what you want. Now you need someone to build it right.",
        body: "Whether it's from scratch or a rebuild, I'll handle the development end-to-end with a focus on quality, performance, and maintainability. You get a production-ready app built with modern tools, not a prototype that falls apart at scale.",
      };
    case 2: // Growth
      return {
        tagline: "Your app is live but it's not reaching its potential yet.",
        body: "Getting downloads and revenue is a different skill than building the app itself. I'll help you with ASO, acquisition strategy, paywall optimization, and monetization so your app actually generates the return you're looking for.",
      };
    case 3: // Full partner
      return {
        tagline: "You want a technical partner who thinks like a business owner.",
        body: "From defining the strategy to shipping the app and growing it, I'll be involved at every step. Think of it as having a CTO-level partner without the equity split. We'll plan, build, and launch together.",
      };
    default:
      return getRecommendation(0);
  }
}

// ─── CTA Block ──────────────────────────────────────────────────────

function CTABlock({
  calUrl,
  leadId,
  onBookingClick,
  label,
  dataGoal,
}: {
  calUrl: string;
  leadId?: string;
  onBookingClick?: () => void;
  label: string;
  dataGoal: string;
}) {
  return (
    <div className="text-center">
      <a
        href={calUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          if (leadId) localStorage.setItem("quiz_lead_id", leadId);
          onBookingClick?.();
        }}
        data-fast-goal={dataGoal}
        className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
      >
        {label}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </a>
      <p className="mt-3 text-sm text-[#c9c4bc]/60">
        Spots are limited. I only take on a few projects at a time.
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ResultBusiness({
  firstName,
  answers,
  leadId,
  email,
  phone,
  source,
  onBookingClick,
}: {
  firstName: string;
  answers: Record<string, number | string>;
  leadId?: string;
  email?: string;
  phone?: string;
  source?: string;
  onBookingClick?: () => void;
}) {
  const q3 = (answers.q3 as number) ?? 0;
  const recommendation = getRecommendation(q3);
  const needLabel = getNeedLabel(q3);

  const params = new URLSearchParams();
  if (leadId) params.set("utm_notes", leadId);
  if (firstName) params.set("name", firstName);
  if (email) params.set("email", email);
  if (phone) params.set("attendeePhoneNumber", phone);
  const qs = params.toString();
  const calUrl = qs ? `${CAL_BASE}?${qs}` : CAL_BASE;
  const displayName = firstName || "you";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <motion.div {...fadeInUp} className="text-center mb-16">
        <h1 className="font-serif text-4xl font-bold tracking-tight leading-tight sm:text-5xl mb-4">
          Here&apos;s your personalized recommendation, {displayName}
        </h1>
        <p className="text-[#c9c4bc] text-lg leading-relaxed max-w-xl mx-auto mb-6">
          Based on your answers, {needLabel}.
        </p>
        <div className="max-w-xl mx-auto text-left">
          <p className="text-[#f4cf8f] font-semibold text-lg mb-2">
            {recommendation.tagline}
          </p>
          <p className="text-[#c9c4bc] leading-relaxed">
            {recommendation.body}
          </p>
        </div>
      </motion.div>


      {/* CTA #1 */}
      <motion.div {...fadeInUp} className="mb-24">
        <CTABlock
          calUrl={calUrl}
          leadId={leadId}
          onBookingClick={onBookingClick}
          label="Book your free discovery call"
          dataGoal="quiz_result_business_cta"
        />
      </motion.div>

      {/* About Arthur */}
      <motion.div {...fadeInUp} className="pt-20 mb-24">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-center">
          Who is Arthur?
        </h2>
        <div className="flex flex-col items-center text-center">
          <img
            src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
            alt="Arthur"
            className="h-20 w-20 rounded-full border border-white/10 mb-6"
          />
          <p className="text-lg text-[#c9c4bc] leading-relaxed max-w-2xl mb-4">
            I&apos;ve built and shipped multiple mobile apps, grown them to
            profitability, and documented the entire journey publicly. Along the
            way I&apos;ve helped businesses and founders turn their app ideas
            into real products that generate revenue.
          </p>
          <p className="text-lg text-[#c9c4bc] leading-relaxed max-w-2xl mb-6">
            I&apos;m not an agency with layers of project managers. When you work
            with me, you work directly with the person who writes the code, defines
            the strategy, and cares about your results as much as you do.
          </p>
          <p className="text-lg text-[#f1ebe2] font-medium leading-relaxed max-w-2xl">
            I only take on a handful of projects at a time so I can give each
            one the attention it deserves.
          </p>
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.div {...fadeInUp} className="pt-20 pb-12">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-center">
          Let&apos;s talk about your project
        </h2>
        <p className="text-[#c9c4bc] mb-6 max-w-md mx-auto text-center">
          Book a free 30-minute discovery call. No commitment, no pressure,
          just an honest conversation about what you need and how I can help.
        </p>
        <CTABlock
          calUrl={calUrl}
          leadId={leadId}
          onBookingClick={onBookingClick}
          label="Book your free discovery call"
          dataGoal="quiz_result_business_cta_final"
        />
      </motion.div>
    </div>
  );
}
