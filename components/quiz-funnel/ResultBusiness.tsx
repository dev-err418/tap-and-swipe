"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getProfileType, type ProfileType } from "./quizData";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const CAL_BASE = "https://cal.com/arthur-builds-stuff/app-sprint-application";

function CTABlock({
  calUrl,
  leadId,
  onBookingClick,
  label,
  caption,
  dataGoal,
}: {
  calUrl: string;
  leadId?: string;
  onBookingClick?: () => void;
  label: string;
  caption: string;
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
      <p className="mt-3 text-sm text-[#c9c4bc]/70">{caption}</p>
    </div>
  );
}

function getScaleCopy() {
  return {
    title: "Book your scaling call",
    body: "Use the link below to book your call. I will review your app and your growth setup before we speak.",
    ctaLabel: "Book the call",
    ctaCaption: "For growth, ads scaling, and attribution help.",
  };
}

function getBuildCopy() {
  return {
    title: "Book your build call",
    body: "Use the link below to book your call. I will treat it as a product and build conversation.",
    ctaLabel: "Book the call",
    ctaCaption: "For launch, build, and product-side help.",
  };
}

function ResultCard({
  profileType,
  firstName,
  leadId,
  email,
  phone,
  onBookingClick,
}: {
  profileType: Exclude<ProfileType, "disqualified">;
  firstName: string;
  leadId?: string;
  email?: string;
  phone?: string;
  onBookingClick?: () => void;
}) {
  const copy = profileType === "scale" ? getScaleCopy() : getBuildCopy();

  const params = new URLSearchParams();
  if (leadId) params.set("utm_notes", leadId);
  if (firstName) params.set("name", firstName);
  if (email) params.set("email", email);
  if (phone) params.set("attendeePhoneNumber", phone);
  const qs = params.toString();
  const calUrl = qs ? `${CAL_BASE}?${qs}` : CAL_BASE;

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div {...fadeInUp} className="mb-16 text-center">
        <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight leading-tight sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[#f1ebe2]">
          {copy.body}
        </p>
      </motion.div>

      <motion.div {...fadeInUp} className="pb-12 pt-6">
        <CTABlock
          calUrl={calUrl}
          leadId={leadId}
          onBookingClick={onBookingClick}
          label={copy.ctaLabel}
          caption={copy.ctaCaption}
          dataGoal={`quiz_result_${profileType}_cta`}
        />
      </motion.div>
    </div>
  );
}

function DisqualifiedResult() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="mx-auto max-w-2xl text-center">
      <motion.div {...fadeInUp}>
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-tight sm:text-5xl">
          This offer is not for your current stage
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#c9c4bc]">
          I only take these calls for founders or small teams already operating a real B2C app business.
          If you are a developer, freelancer, or still exploring, this is not the right funnel.
          The better next step is the community path.
        </p>
        <a
          href="/app-sprint-community"
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20"
        >
          Go to App Sprint Community
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      </motion.div>
      </div>
    </div>
  );
}

export default function ResultBusiness({
  firstName,
  answers,
  leadId,
  email,
  phone,
  onBookingClick,
}: {
  firstName: string;
  answers: Record<string, number | string>;
  leadId?: string;
  email?: string;
  phone?: string;
  onBookingClick?: () => void;
}) {
  const profileType = getProfileType(answers);

  if (profileType === "disqualified") {
    return <DisqualifiedResult />;
  }

  return (
    <ResultCard
      profileType={profileType}
      firstName={firstName}
      leadId={leadId}
      email={email}
      phone={phone}
      onBookingClick={onBookingClick}
    />
  );
}
