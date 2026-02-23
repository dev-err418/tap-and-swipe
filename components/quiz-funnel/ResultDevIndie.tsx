"use client";

import { motion } from "framer-motion";
import { Calendar, ExternalLink, CheckCircle } from "lucide-react";
import { getBlockageLabel } from "./quizData";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const CAL_BASE = "https://cal.com/arthur-builds-stuff/app-sprint-application";

const BENEFITS = [
  {
    title: "Production-ready boilerplate",
    desc: "Payments, analytics, attribution (MMP), Claude Code config... everything is wired up. You just focus on your product.",
  },
  {
    title: "Weekly 1:1 calls with me",
    desc: "We move forward together every week. Strategy, code review, marketing, monetization.",
  },
  {
    title: "Complete video course",
    desc: "From ideation to scaling — the entire process, step by step.",
  },
  {
    title: "Active Discord community",
    desc: "Connect with other indie devs who are building. You're no longer alone.",
  },
  {
    title: "24/7 support via WhatsApp & Discord",
    desc: "Got a question? Stuck on something? Message me anytime — I'm here whenever you need.",
  },
  {
    title: "Results guarantee",
    desc: "If your app isn't live and generating revenue, I keep working with you until it is.",
  },
];

const TIMELINE = [
  { step: "Step 1", title: "Discovery call", desc: "We validate together that the program is the right fit for you." },
  { step: "Step 2", title: "Idea validation & niche", desc: "We find or validate your profitable app idea." },
  { step: "Step 3", title: "Accelerated development", desc: "You build your app on my boilerplate (saving weeks)." },
  { step: "Step 4", title: "Publishing & ASO", desc: "Your app goes live with optimized store listings." },
  { step: "Step 5", title: "Organic then paid growth", desc: "We launch user acquisition." },
];


export default function ResultDevIndie({
  firstName,
  answers,
  leadId,
  onBookingClick,
}: {
  firstName: string;
  answers: Record<string, number>;
  leadId?: string;
  onBookingClick?: () => void;
}) {
  const blocker = getBlockageLabel(answers.q4 ?? 0);
  const calUrl = leadId ? `${CAL_BASE}?utm_notes=${leadId}` : CAL_BASE;
  const displayName = firstName || "you";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <motion.div {...fadeInUp} className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold tracking-tight leading-tight sm:text-5xl mb-4">
          Congratulations {displayName}!
        </h1>

        <p className="text-[#c9c4bc] text-lg leading-relaxed max-w-xl mx-auto">
          All your answers have been taken into account. You have the technical foundation but
          you&apos;re missing a structured framework to launch the right way without wasting months
          figuring it out alone. Your main blocker: {blocker}. The good news: this is exactly
          where having an expert co-pilot makes the difference between a side project that stalls
          and an app that&apos;s live and generating revenue.
        </p>
      </motion.div>

      {/* VSL */}
      <motion.div {...fadeInUp} className="mb-12">
        <div className="aspect-video rounded-2xl overflow-hidden border border-white/5">
          <iframe
            src="https://www.youtube.com/embed/Zq37It_smAk"
            title="Presentation video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </motion.div>

      {/* Explanation */}
      <motion.div {...fadeInUp} className="mb-12">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Why this program is built for you
        </h2>
        <p className="text-[#c9c4bc] leading-relaxed mb-4">
          You&apos;re an ambitious developer who wants to build your own apps and make a living from them.
          The problem is that without structure and feedback, you end up spinning your wheels
          for months — trial and error, wrong decisions, wasted time.
        </p>
        <p className="text-[#c9c4bc] leading-relaxed">
          The Indie Dev program gives you speed, confidence, and direct access to someone who&apos;s
          done it. Weekly calls, code reviews, and a clear strategy — I&apos;m your co-pilot from
          zero to a live, monetized app. And I stay until it works.
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
          href={calUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onBookingClick}
          data-fast-goal="quiz_result_dev_indie_cta"
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
          Book your free call (30 min)
          <ExternalLink className="h-4 w-4 opacity-60" />
        </a>
        <p className="mt-3 text-sm text-[#c9c4bc]/60">
          Limited spots — I only mentor 5 people at a time.
        </p>
      </motion.div>

      {/* How it works - Timeline */}
      <motion.div {...fadeInUp} className="mb-16">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-8 text-center">
          How it works
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
            I&apos;m Arthur, an indie mobile developer. I build and monetize mobile apps with
            Expo/React Native. I have 3 published apps generating recurring revenue, and
            I share everything transparently on my YouTube channel (18K subscribers). My real
            numbers, my mistakes, my strategies — everything is public. This program is
            exactly the shortcut I wish I had when I started.
          </p>
        </div>
      </motion.div>

      {/* More social proof */}
      <motion.div {...fadeInUp} className="mb-16 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#c9c4bc]">
          <span>👥 40+ devs mentored</span>
          <span>⭐ 5/5 satisfaction</span>
          <span>📱 3 published apps</span>
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.div {...fadeInUp} className="text-center pb-12">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          All these results started with a simple 15-minute call.
        </h2>
        <p className="text-[#c9c4bc] mb-6 max-w-md mx-auto">
          Book your slot now and let&apos;s talk about your project.
        </p>
        <a
          href={calUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-fast-goal="quiz_result_dev_indie_cta_final"
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
          Book your free call
          <ExternalLink className="h-4 w-4 opacity-60" />
        </a>
      </motion.div>
    </div>
  );
}
