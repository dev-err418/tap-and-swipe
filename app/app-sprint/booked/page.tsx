"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

function BookedContent() {
  const searchParams = useSearchParams();
  const fired = useRef(false);

  // Confetti on mount
  useEffect(() => {
    const end = Date.now() + 400;
    const colors = ["#f4cf8f", "#f1ebe2", "#c9c4bc"];
    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 70,
        startVelocity: 60,
        origin: { x: 0, y: 1 },
        colors,
        ticks: 80,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 70,
        startVelocity: 60,
        origin: { x: 1, y: 1 },
        colors,
        ticks: 80,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  // Notify API about the booking
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

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
    <main className="min-h-screen bg-[#2a2725] px-4 pt-48 pb-16 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      <div className="mx-auto max-w-3xl">
        <motion.div {...fadeInUp} className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold tracking-tight leading-tight sm:text-5xl mb-4">
            Your call with Arthur is booked!
          </h1>

          <p className="text-[#c9c4bc] text-lg leading-relaxed max-w-xl mx-auto">
            I want to congratulate you for taking this first step toward
            building something real. Most people talk about launching an app
            someday. You just took action. That already puts you ahead.
          </p>
        </motion.div>

        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="mb-10 rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-4 text-center">
            <p className="text-[#c9c4bc] text-sm">
              This call is reserved for those who are ready to invest in
              themselves now. If that&apos;s you, you&apos;re in the right place.
            </p>
          </div>

          <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl mb-2 text-center">
            Watch this video before your call
          </h2>

          <p className="text-[#c9c4bc] text-sm text-center mb-6">
            Otherwise, your appointment will be cancelled.
          </p>

          <div className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-[#f4cf8f]/10 ring-1 ring-white/10">
            <iframe
              src="https://www.youtube.com/embed/Ml22j9SWt0o"
              title="Preparation video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full"
            />
          </div>
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
