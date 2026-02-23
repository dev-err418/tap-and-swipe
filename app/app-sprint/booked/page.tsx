"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { PartyPopper, AlertTriangle } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

function BookedContent() {
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // cal.com forwards `email` when "Forward parameters" is enabled
    const email = searchParams.get("email");
    const leadId = localStorage.getItem("quiz_lead_id");

    if (!email && !leadId) return;

    fetch("/api/quiz-lead/booked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || undefined, leadId: leadId || undefined }),
    }).catch(() => {});

    localStorage.removeItem("quiz_lead_id");
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-[#2a2725] px-4 py-16 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      <div className="mx-auto max-w-3xl">
        {/* Celebratory header */}
        <motion.div {...fadeInUp} className="text-center mb-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#f4cf8f]/10 ring-1 ring-[#f4cf8f]/20">
            <PartyPopper className="h-10 w-10 text-[#f4cf8f]" />
          </div>

          <h1 className="font-serif text-4xl font-bold tracking-tight leading-tight sm:text-5xl mb-6">
            Congratulations, your call with Arthur is booked!
          </h1>

          <p className="text-[#c9c4bc] text-lg leading-relaxed max-w-xl mx-auto">
            I want to congratulate you for taking this first step toward
            building something real. Most people talk about launching an app
            someday &mdash; you just took action. That already puts you ahead.
          </p>
        </motion.div>

        {/* Important notice */}
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-12 rounded-2xl border border-white/5 bg-white/[0.02] p-6"
        >
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-[#f4cf8f]" />
            <p className="text-[#c9c4bc] leading-relaxed">
              <span className="font-semibold text-[#f1ebe2]">Important:</span>{" "}
              this call is reserved for those who are ready to invest in
              themselves now. If that&apos;s you, you&apos;re in the right
              place.
            </p>
          </div>
        </motion.div>

        {/* Video section */}
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl mb-6">
            Watch this short video before your call
          </h2>

          <div className="aspect-video overflow-hidden rounded-2xl border border-white/5">
            <iframe
              src="https://www.youtube.com/embed/VIDEO_ID"
              title="Preparation video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>

          <p className="mt-6 text-[#c9c4bc] text-sm">
            Otherwise, your appointment will be cancelled.
          </p>
        </motion.div>
      </div>
    </main>
  );
}

export default function BookedPage() {
  return (
    <Suspense>
      <BookedContent />
    </Suspense>
  );
}
