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
    desc: "No need to hire a mobile dev. Payments, analytics, attribution... everything is wired up.",
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
    desc: "From ideation to scaling, the entire process, step by step.",
  },
  {
    title: "24/7 support via WhatsApp & Discord",
    desc: "Got a question? Stuck on something? Message me anytime. I'm here whenever you need.",
  },
  {
    title: "Results guarantee",
    desc: "If your app isn't live and generating revenue, I keep working with you until it is.",
  },
];

const TIMELINE = [
  { step: "Week 1", title: "Audit & Strategy", desc: "We analyze your market, your competition, and define the perfect MVP." },
  { step: "Week 2-5", title: "Architecture & Development", desc: "We build the technical foundations with an architecture that scales." },
  { step: "Week 6", title: "MVP & Validation", desc: "We launch the MVP, validate with real users, and iterate." },
  { step: "Week 7-12", title: "Monetization & Launch", desc: "We implement monetization, onboarding, and officially launch." },
];


export default function ResultEntreprise({
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
          You already have a running business. A mobile app is the obvious growth lever,
          but you don&apos;t want to burn €20K on an agency or waste 6 months figuring it out alone.
          You want to launch fast, launch right, and stay in control. Your main blocker: {blocker}.
          That&apos;s exactly why you need an expert co-pilot by your side the whole way.
        </p>
      </motion.div>

      {/* VSL */}
      <motion.div {...fadeInUp} className="mb-20">
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
      <motion.div {...fadeInUp} className="pt-20 mb-20">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-center">
          Why this program is built for you
        </h2>
        <p className="text-[#c9c4bc] leading-relaxed mb-4">
          You&apos;re an entrepreneur who wants to launch a mobile product for your business.
          You need speed, so you skip the trial and error. Confidence, so you know you&apos;re doing it right
          at every step. And access to someone who&apos;s done it, right there with you.
        </p>
        <p className="text-[#c9c4bc] leading-relaxed">
          The Enterprise program is your expert co-pilot for 90 days. Business strategy,
          technical execution, monetization. I&apos;m with you the whole way from zero to a
          live, monetized app. And I stay until it works.
        </p>
      </motion.div>

      {/* Benefits */}
      <motion.div {...fadeInUp} className="pt-20 mb-20">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-6 text-center">
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
      <motion.div {...fadeInUp} className="text-center mb-24">
        <a
          href={calUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onBookingClick}
          data-fast-goal="quiz_result_entreprise_cta"
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
          Book your free call (30 min)
          <ExternalLink className="h-4 w-4 opacity-60" />
        </a>
        <p className="mt-3 text-sm text-[#c9c4bc]/60">
          Let&apos;s analyze together if a mobile app can accelerate your business.
        </p>
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
            I built and scaled a profitable startup, created two apps with recurring
            revenue, and shared every step publicly on YouTube. Building was fun, but
            somewhere along the way, shipping alone started to feel empty.
          </p>
          <p className="text-lg text-[#c9c4bc] leading-relaxed max-w-2xl mb-6">
            Then I started helping entrepreneurs launch their own mobile products. Watching
            someone go from an idea to a live, revenue-generating app changed everything
            for me. That&apos;s where the meaning came back. Today, I&apos;ve helped 40+
            people make their first revenue as app founders. Honestly, their wins
            feel bigger than mine.
          </p>
          <p className="text-lg text-[#f1ebe2] font-medium leading-relaxed max-w-2xl">
            This program exists because I wish someone had done the same for me.
          </p>

        </div>
      </motion.div>

      {/* How it works - Timeline */}
      <motion.div {...fadeInUp} className="pt-20 mb-24">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-8 text-center">
          The program in 4 phases
        </h2>
        <div className="space-y-6 relative max-w-md mx-auto">
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

      {/* Final CTA */}
      <motion.div {...fadeInUp} className="pt-20 text-center pb-12">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-center">
          Ready to launch your mobile product?
        </h2>
        <p className="text-[#c9c4bc] mb-6 max-w-md mx-auto">
          Book a free 30-minute call. We&apos;ll talk about your business,
          your goals, and I&apos;ll show you how we can launch in 90 days.
        </p>
        <a
          href={calUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-fast-goal="quiz_result_entreprise_cta_final"
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
