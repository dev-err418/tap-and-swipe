"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { FadeIn } from "./fade-in";

const ICONS = [
  // Left col 1
  { left: "2%", top: "8%", size: 64, rounded: "2xl", color: "bg-gradient-to-br from-gray-800 to-gray-900", rotate: -12 },
  { left: "1%", top: "40%", size: 56, rounded: "2xl", color: "bg-gray-900", rotate: 8 },
  { left: "-1%", top: "62%", size: 48, rounded: "2xl", color: "bg-red-500", rotate: -18 },
  { left: "1%", top: "82%", size: 56, rounded: "full", color: "bg-emerald-400", rotate: 6 },
  // Left col 2
  { left: "10%", top: "5%", size: 48, rounded: "2xl", color: "bg-violet-500", rotate: 15 },
  { left: "11%", top: "35%", size: 40, rounded: "full", color: "bg-gray-900", rotate: -10 },
  { left: "10%", top: "70%", size: 48, rounded: "full", color: "bg-gray-800", rotate: 20 },
  // Right col 1
  { right: "10%", top: "4%", size: 56, rounded: "2xl", color: "bg-gray-900", rotate: 12 },
  { right: "9%", top: "42%", size: 40, rounded: "2xl", color: "bg-orange-500", rotate: -14 },
  { right: "10%", top: "68%", size: 48, rounded: "2xl", color: "bg-red-400/80", rotate: 18 },
  // Right col 2
  { right: "1%", top: "10%", size: 48, rounded: "2xl", color: "bg-blue-400/60", rotate: -8 },
  { right: "0%", top: "38%", size: 64, rounded: "2xl", color: "bg-gradient-to-br from-pink-400 to-violet-400", rotate: 10 },
  { right: "-1%", top: "65%", size: 56, rounded: "2xl", color: "bg-gray-900", rotate: -16 },
  { right: "2%", top: "85%", size: 40, rounded: "full", color: "bg-gray-700", rotate: 22 },
] as const;

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="animate-[spin_0.8s_steps(8)_infinite]">
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="9" y1="2" x2="9" y2="5.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity={1 - i * 0.12}
          transform={`rotate(${i * 45} 9 9)`}
        />
      ))}
    </svg>
  );
}

function FloatingIcon({
  icon,
  index,
}: {
  icon: (typeof ICONS)[number];
  index: number;
}) {
  const isLeft = "left" in icon;
  const posStyle = {
    ...(isLeft ? { left: icon.left } : { right: (icon as { right: string }).right }),
    top: icon.top,
  };
  const delay = 0.1 + (parseFloat(icon.top) / 100) * 0.5;

  return (
    <motion.div
      className="absolute"
      style={posStyle}
      animate={{ y: [0, index % 2 === 0 ? -10 : 10, 0] }}
      transition={{
        y: {
          duration: 5 + (index % 3),
          delay: 0.8 + index * 0.04,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        },
      }}
    >
      <motion.div
        className={`${icon.color} rounded-${icon.rounded}`}
        style={{ width: icon.size, height: icon.size }}
        initial={{ opacity: 0, scale: 0.8, rotate: icon.rotate }}
        animate={{ opacity: 1, scale: 1, rotate: icon.rotate }}
        transition={{
          opacity: { duration: 0.6, delay, ease: EASE },
          scale: { duration: 0.6, delay, ease: EASE },
        }}
      />
    </motion.div>
  );
}

export function Hero() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const email = new FormData(e.currentTarget).get("email") as string;
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      className="relative flex min-h-[600px] flex-1 flex-col items-center justify-center px-6 text-center"
      style={{ minHeight: "max(600px, calc(100dvh - 72px))" }}
    >
      {/* Floating icons */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {ICONS.map((icon, i) => (
          <FloatingIcon key={i} icon={icon} index={i} />
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10">
        <FadeIn delay={0.05} y={20}>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
            Real stories from people building mobile apps
          </h1>
        </FadeIn>

        <FadeIn delay={0.2} y={20}>
          <p className="mt-6 mx-auto max-w-xl text-base text-black/50 sm:text-lg">
            Every week I sit down with an app builder and ask them everything: the idea, the grind, the failures, and what finally worked.
          </p>
        </FadeIn>

        <FadeIn delay={0.35} y={20}>
          {status === "ok" ? (
            <p className="mt-10 text-sm font-medium text-emerald-600">You&apos;re in! Check your inbox.</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 mx-auto flex w-full max-w-sm flex-col gap-2">
              <div className="flex h-12 rounded-full border border-black/15 bg-black/5 transition-colors focus-within:border-black/40 focus-within:ring-1 focus-within:ring-black/40">
                <input
                  type="email"
                  name="email"
                  placeholder="you@email.com"
                  required
                  className="h-full flex-1 rounded-full bg-transparent px-5 text-sm text-black placeholder:text-black/30 outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="relative -my-px -mr-px h-[calc(100%+2px)] shrink-0 rounded-full bg-black px-5 text-sm font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50"
                >
                  <span className={status === "loading" ? "invisible" : ""}>Subscribe</span>
                  {status === "loading" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Spinner />
                    </span>
                  )}
                </button>
              </div>
              {status === "error" && (
                <p className="pl-5 text-xs text-red-500">Something went wrong. Try again.</p>
              )}
              <p className="pl-5 text-xs text-black/30">One email per episode. No spam, ever.</p>
            </form>
          )}
        </FadeIn>
      </div>
    </section>
  );
}
