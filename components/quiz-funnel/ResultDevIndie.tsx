"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
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

const WHATS_INCLUDED = [
  "Production-ready boilerplate",
  "Paywall templates + A/B framework",
  "Complete video course",
  "1:1 mentoring calls",
  "Group lives on growth & ads",
  "Organic growth playbook",
  "ASO framework",
  "24/7 async support (WhatsApp & Discord)",
  "Private Discord community",
  "Lifetime updates",
];

const TIMELINE = [
  { step: "Step 1", title: "Find your idea", desc: "We find or validate your profitable app niche together." },
  { step: "Step 2", title: "Code your MVP", desc: "You build on the boilerplate. Payments, analytics, attribution — all wired up." },
  { step: "Step 3", title: "Publish to the stores", desc: "Your app goes live with optimized store listings and ASO." },
  { step: "Step 4", title: "Organic growth", desc: "Content strategy, social media, community — free acquisition." },
  { step: "Step 5", title: "Paid ads", desc: "We scale with paid acquisition once organic is working." },
];

const DELIVERY = [
  { label: "Steps 1-3", format: "1:1 calls", desc: "Personal mentoring for idea, build, and publish phases" },
  { label: "Steps 4-5", format: "Group lives", desc: "Learn growth strategies with other indie devs" },
  { label: "Ongoing", format: "Async support", desc: "24/7 WhatsApp & Discord — I answer when you need me" },
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

      {/* 3-Tier Stack */}
      <motion.div {...fadeInUp} className="pt-20 mb-20">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-8 text-center">
          What you get
        </h2>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {WHATS_INCLUDED.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-[#f4cf8f] shrink-0 mt-0.5" />
              <span className="text-[#f1ebe2]">{item}</span>
            </div>
          ))}
        </div>
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

      {/* 5 Steps Timeline */}
      <motion.div {...fadeInUp} className="pt-20 mb-24">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-8 text-center">
          The 5-step roadmap
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

      {/* Delivery Model */}
      <motion.div {...fadeInUp} className="pt-20 mb-24">
        <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl mb-8 text-center">
          How we work together
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {DELIVERY.map((d, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <span className="text-xs font-medium text-[#f4cf8f] uppercase tracking-wider">{d.label}</span>
              <h3 className="text-lg font-bold mt-2 mb-1">{d.format}</h3>
              <p className="text-sm text-[#c9c4bc]">{d.desc}</p>
            </div>
          ))}
        </div>
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
