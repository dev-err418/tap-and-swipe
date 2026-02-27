"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import type { E164Number } from "libphonenumber-js/core";
import PhoneInput from "./PhoneInput";
import { getBlockageLabel } from "./quizData";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const CAL_BASE = "https://cal.com/arthur-builds-stuff/app-sprint-application";

type ProgramStep = {
  emoji: string;
  title: string;
  format: string;
  description: string;
  includes: string[];
};

const PROGRAM_STEPS: ProgramStep[] = [
  {
    emoji: "💡",
    title: "Find your idea",
    format: "1:1 calls",
    description: "Before you write a single line of code, we make sure people actually want what you're building. Data, not gut feelings.",
    includes: [
      "How to find app ideas that actually make money",
      "ASO basics: pick keywords that get you discovered",
      "The 3-day validation test",
    ],
  },
  {
    emoji: "💻",
    title: "Build your MVP",
    format: "1:1 calls",
    description: "You build on the production-ready boilerplate. Payments, analytics, attribution, all wired up from day one.",
    includes: [
      "Production-ready boilerplate + Figma files",
      "Paywall templates + A/B testing framework",
      "Set up subscriptions with RevenueCat",
    ],
  },
  {
    emoji: "🚀",
    title: "Publish to the stores",
    format: "1:1 calls",
    description: "Your app goes live with optimized store listings and ASO. No guessing on screenshots, descriptions, or keywords.",
    includes: [
      "App Store Connect setup & first TestFlight build",
      "Optimized store listing & screenshots",
      "ASO framework for organic discovery",
    ],
  },
  {
    emoji: "📈",
    title: "Organic growth",
    format: "Group lives",
    description: "Content strategy, social media, community. Free acquisition channels that compound over time.",
    includes: [
      "Organic growth playbook",
      "TikTok account warm-up & content strategy",
      "ASO optimization after launch",
    ],
  },
  {
    emoji: "💰",
    title: "Paid ads",
    format: "Group lives",
    description: "Once organic is working, we scale with paid acquisition. Learn to run profitable campaigns.",
    includes: [
      "Apple Search Ads: first campaign setup",
      "Target any country on TikTok with a VPN",
      "AB test everything: pricing, paywalls, creatives",
    ],
  },
];


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InlineOptinForm({
  source,
  onLeadCreated,
}: {
  source?: string;
  onLeadCreated: (leadId: string, firstName: string, email: string, phone: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<Country>("US");
  const [phoneValue, setPhoneValue] = useState<E164Number | undefined>();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim()) { setError("Your first name is required"); return; }
    if (!EMAIL_REGEX.test(email)) { setError("Please enter a valid email address"); return; }
    if (!phoneValue || !isValidPhoneNumber(phoneValue)) { setError("Please enter a valid phone number"); return; }
    if (!consent) { setError("You must accept the privacy policy"); return; }

    setLoading(true);
    try {
      const parsed = parsePhoneNumber(phoneValue);
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          phone: parsed?.nationalNumber || "",
          countryCode: parsed ? `+${parsed.countryCallingCode}` : "+1",
          profileType: "dev-indie",
          variant: "direct",
          answers: {},
          source: source || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); setLoading(false); return; }
      onLeadCreated(data.id, firstName.trim(), email.trim(), phoneValue || "");
    } catch {
      setError("Something went wrong, please try again");
      setLoading(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-auto space-y-4 mt-6 overflow-hidden"
    >
      <input
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="Your first name"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f1ebe2] placeholder:text-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f1ebe2] placeholder:text-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
      />
      <PhoneInput
        country={phoneCountry}
        value={phoneValue}
        onCountryChange={setPhoneCountry}
        onChange={setPhoneValue}
      />
      <label className="flex items-start gap-3 text-left cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#f4cf8f]"
        />
        <span className="text-sm text-[#c9c4bc]">
          I agree to the{" "}
          <a href="/app-sprint/privacy" target="_blank" className="underline underline-offset-2 hover:text-[#f1ebe2]">
            privacy policy
          </a>{" "}
          and to being contacted by email and phone.
        </span>
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Book my free call
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>
    </motion.form>
  );
}

function CTABlock({
  variant,
  calUrl,
  leadId,
  source,
  onBookingClick,
  label,
  dataGoal,
}: {
  variant: "quiz" | "direct";
  calUrl: string;
  leadId?: string;
  source?: string;
  onBookingClick?: () => void;
  label: string;
  dataGoal: string;
}) {
  const [showForm, setShowForm] = useState(false);

  function handleLeadCreated(newLeadId: string, firstName: string, email: string, phone: string) {
    onBookingClick?.();
    const params = new URLSearchParams();
    params.set("utm_notes", newLeadId);
    params.set("name", firstName);
    params.set("email", email);
    params.set("attendeePhoneNumber", phone);
    window.open(`${CAL_BASE}?${params.toString()}`, "_blank");
  }

  if (variant === "direct") {
    return (
      <div className="text-center">
        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.button
              key="cta-btn"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(true)}
              data-fast-goal={dataGoal}
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
            >
              {label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </motion.button>
          ) : (
            <InlineOptinForm
              key="cta-form"
              source={source}
              onLeadCreated={handleLeadCreated}
            />
          )}
        </AnimatePresence>
        <p className="mt-3 text-sm text-[#c9c4bc]/60">
          Limited spots. I only mentor 5 people at a time.
        </p>
      </div>
    );
  }

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
        Limited spots. I only mentor 5 people at a time.
      </p>
    </div>
  );
}


function ProgramRoadmap() {
  const [activeTab, setActiveTab] = useState(0);
  const active = PROGRAM_STEPS[activeTab];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12 border-b border-white/10 pb-8">
        {PROGRAM_STEPS.map((step, i) => {
          const isActive = activeTab === i;
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`group flex flex-col items-center gap-3 transition-all duration-300 outline-none cursor-pointer ${
                isActive ? "text-[#f4cf8f] scale-105" : "text-[#c9c4bc] hover:text-[#f1ebe2]"
              }`}
            >
              <div className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all ${
                isActive
                  ? "bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 shadow-[0_0_15px_rgba(244,207,143,0.1)]"
                  : "bg-white/5 border border-transparent group-hover:bg-white/10"
              }`}>
                <span className="text-2xl">{step.emoji}</span>
              </div>
              <span className="text-sm font-medium">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active content */}
      <div className="min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="max-w-xl mx-auto"
          >
            <div className="mb-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 text-[#f4cf8f] text-xs font-bold uppercase tracking-wider">
                {active.format}
              </div>
            </div>

            <h3 className="text-3xl font-serif font-bold text-[#f1ebe2] mb-4">
              {active.title}
            </h3>
            <p className="text-[#c9c4bc] text-lg leading-relaxed mb-8">
              {active.description}
            </p>

            <div className="space-y-4">
              {active.includes.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#f4cf8f] shrink-0 mt-0.5" />
                  <span className="text-[#f1ebe2]/90">{item}</span>
                </div>
              ))}
            </div>

            <p className="mt-8 text-sm text-[#c9c4bc]/60">
              + 24/7 async support (WhatsApp & Discord) and private community access throughout the program
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}

export default function ResultDevIndie({
  firstName,
  answers,
  leadId,
  email,
  phone,
  variant = "quiz",
  source,
  onBookingClick,
}: {
  firstName: string;
  answers: Record<string, number>;
  leadId?: string;
  email?: string;
  phone?: string;
  variant?: "quiz" | "direct";
  source?: string;
  onBookingClick?: () => void;
}) {
  const hasBlocker = answers.q4 !== undefined;
  const blocker = hasBlocker ? getBlockageLabel(answers.q4) : null;

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
      <motion.div {...fadeInUp} className="text-center mb-12">
        {variant === "quiz" ? (
          <>
            <h1 className="font-serif text-4xl font-bold tracking-tight leading-tight sm:text-5xl mb-4">
              Congratulations {displayName}!
            </h1>
            <p className="text-[#c9c4bc] text-lg leading-relaxed max-w-xl mx-auto">
              All your answers have been taken into account. You have the technical foundation but
              you&apos;re missing a structured framework to launch the right way without wasting months
              figuring it out alone.
              {blocker && <> Your main blocker: {blocker}.</>}
              {" "}The good news: this is exactly where having an expert co-pilot makes the difference
              between a side project that stalls and an app that&apos;s live and generating revenue.
            </p>
          </>
        ) : (
          <>
            <a
              href="https://www.youtube.com/@ArthurBuildsStuff"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <img
                src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
                alt="ArthurBuildsStuff"
                className="h-8 w-8 rounded-full border border-[#f4cf8f]/20"
              />
              <span className="text-sm font-medium text-[#c9c4bc]">By ArthurBuildsStuff</span>
            </a>
            <h1 className="text-5xl font-extrabold tracking-tight leading-[1] sm:text-7xl">
              Launch a{" "}
              profitable app{" "}
              <span
                className="text-[#f4cf8f] box-decoration-clone px-2 -mx-2"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100' preserveAspectRatio='none'%3E%3Cpath d='M2 12 Q40 6 80 10 Q130 4 170 8 Q190 5 198 2 L199 90 Q170 96 130 92 Q90 98 50 94 Q20 99 1 96 Z' fill='rgba(244,207,143,0.15)'/%3E%3C/svg%3E")`,
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                }}
              >
                without the guesswork
              </span>
            </h1>
            <p className="text-[#c9c4bc] text-lg sm:text-xl mt-4 max-w-xl mx-auto">
              A 24-week mentorship program with a proven framework, a production-ready
              boilerplate, and a private community of indie devs building alongside you until
              your app is live and making money.
            </p>
          </>
        )}
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

      {/* Why this program */}
      <motion.div {...fadeInUp} className="pt-20 mb-20">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-center">
          Can you do it alone? Absolutely.
        </h2>
        <p className="text-[#c9c4bc] leading-relaxed max-w-xl mx-auto mb-4">
          Everything you need to launch an app is out there for free. I even made one of the
          most detailed and transparent YouTube series about it. But this program is an
          investment in speed: over 24 weeks you get guidance, constant feedback, and a
          community of builders on the same path.
        </p>
        <p className="text-[#f1ebe2] font-medium leading-relaxed max-w-xl mx-auto text-center">
          If you&apos;re looking for structure, accountability, and someone who&apos;s done it
          before to tell you when you&apos;re on the right track, that&apos;s what this is.
        </p>
      </motion.div>

      {/* Program Roadmap */}
      <motion.div {...fadeInUp} className="pt-20 mb-20">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            What you get
          </h2>
          <p className="mt-4 text-[#c9c4bc]">
            5 steps. From first idea to first revenue on the App Store. Then we do it again.
          </p>
        </div>
        <ProgramRoadmap />
      </motion.div>

      {/* CTA #1 */}
      <motion.div {...fadeInUp} className="mb-24">
        <CTABlock
          variant={variant}
          calUrl={calUrl}
          leadId={leadId}
          source={source}
          onBookingClick={onBookingClick}
          label="Book your free call"
          dataGoal="quiz_result_dev_indie_cta"
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
            I built a profitable startup, created two apps with recurring revenue, and
            shared every step publicly on YouTube. Building was fun, but somewhere along
            the way, shipping alone started to feel empty.
          </p>
          <p className="text-lg text-[#c9c4bc] leading-relaxed max-w-2xl mb-6">
            Then I started helping others launch their own apps. Watching someone go from
            an idea to their first dollar changed everything for me. That&apos;s where
            the meaning came back. Today, I&apos;ve helped 40+ people make their first
            revenue as indie app founders. Honestly, their wins feel bigger than mine.
          </p>
          <p className="text-lg text-[#f1ebe2] font-medium leading-relaxed max-w-2xl">
            This program exists because I wish someone had done the same for me.
          </p>
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.div {...fadeInUp} className="pt-20 pb-12">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-center">
          All these results started with a simple 30-minute call.
        </h2>
        <p className="text-[#c9c4bc] mb-6 max-w-md mx-auto text-center">
          Book your slot now and let&apos;s talk about your project.
        </p>
        <CTABlock
          variant={variant}
          calUrl={calUrl}
          leadId={leadId}
          source={source}
          onBookingClick={onBookingClick}
          label="Book your free call"
          dataGoal="quiz_result_dev_indie_cta_final"
        />
      </motion.div>
    </div>
  );
}
