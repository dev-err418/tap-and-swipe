"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { FadeIn } from "./fade-in";

const ICONS = [
  // Left col 1
  { left: "5%", top: "8%", size: 64, rotate: -12, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/18/73/96/187396d0-9ea0-cd65-83f6-42550506b3f3/Prod-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/120x120bb.jpg" },
  { left: "4%", top: "40%", size: 56, rotate: 8, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/c4/8c/93/c48c9331-24df-f7ba-2837-1719d1eb0a23/AppIcon-0-0-1x_U007epad-0-1-0-0-sRGB-85-220.png/120x120bb.jpg" },
  { left: "2%", top: "62%", size: 48, rotate: -18, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/bb/a5/cc/bba5ccb8-d4df-94d4-4a82-69efab6e4494/logo_youtube_2024_q4_color-0-0-1x_U007emarketing-0-0-0-7-0-0-0-85-220.png/120x120bb.jpg" },
  { left: "4%", top: "82%", size: 56, rotate: 6, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/3e/51/9d/3e519dbc-b0b0-b292-837b-97027c235050/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/120x120bb.jpg" },
  // Left col 2
  { left: "13%", top: "5%", size: 48, rotate: 15, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/10/a5/0e/10a50e08-cf0c-13e8-8f09-6e34f9fe0071/AppIcon-0-0-1x_U007emarketing-0-11-0-sRGB-0-85-220.png/120x120bb.jpg" },
  { left: "14%", top: "35%", size: 40, rotate: -10, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/26/bd/a8/26bda865-2595-a1c4-0c22-3090585566b3/AppIcon-0-0-1x_U007emarketing-0-8-0-0-85-220.png/120x120bb.jpg" },
  { left: "13%", top: "70%", size: 48, rotate: 20, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/22/f8/8d/22f88d97-0776-74fe-6769-1851540ae0c8/AppIcon-0-0-1x_U007epad-0-1-85-220.png/120x120bb.jpg" },
  // Right col 1
  { right: "13%", top: "4%", size: 56, rotate: 12, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/f8/bf/77/f8bf774c-079c-a4ef-ac20-0b9cbb3cbb05/TikTok_AppIcon26-0-0-1x_U007epad-0-1-0-85-220.png/120x120bb.jpg" },
  { right: "12%", top: "42%", size: 40, rotate: -14, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/7f/77/5e/7f775e63-96bf-b789-b2f2-6ce264a7b6a7/AppIconProd-0-0-1x_U007epad-0-0-0-1-0-0-P3-85-220.png/120x120bb.jpg" },
  { right: "13%", top: "68%", size: 48, rotate: 18, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/95/32/df/9532df9f-b41b-6d94-088d-1b927ab32d23/AppIcon-0-0-1x_U007epad-0-1-0-0-0-85-220.png/120x120bb.jpg" },
  // Right col 2
  { right: "4%", top: "10%", size: 48, rotate: -8, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/4e/69/82/4e698215-47f1-536b-3b0f-b8bc421983ea/AppIcon-0-0-1x_U007epad-0-0-0-1-0-0-sRGB-0-85-220.png/120x120bb.jpg" },
  { right: "3%", top: "38%", size: 64, rotate: 10, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/4e/8f/58/4e8f581c-d875-5002-ff4f-085b9961f895/slack_icon_prod-0-0-1x_U007epad-0-1-sRGB-85-220.png/120x120bb.jpg" },
  { right: "2%", top: "65%", size: 56, rotate: -16, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/e0/eb/dc/e0ebdc61-273c-45da-8aea-28e2d5a9e9fb/ProductionAppIcon-0-0-1x_U007emarketing-0-8-0-0-0-85-220.png/120x120bb.jpg" },
  { right: "5%", top: "85%", size: 40, rotate: 22, icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/cf/5e/96/cf5e96b5-cbdf-79f6-8f30-10a95c7ea19f/AppIcon-0-0-1x_U007epad-0-1-0-0-0-85-220.png/120x120bb.jpg" },
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
      <motion.img
        src={icon.icon}
        alt=""
        className="rounded-[22%] shadow-lg"
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

export function Hero({ showSubscribe = true }: { showSubscribe?: boolean }) {
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
      {/* Floating icons — scattered (2xl+) */}
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden xl:block" aria-hidden="true">
        {ICONS.map((icon, i) => (
          <FloatingIcon key={i} icon={icon} index={i} />
        ))}
      </div>

      {/* Icon strip (below 2xl) */}
      <div className="pointer-events-none flex gap-3 mb-8 xl:hidden" aria-hidden="true">
        {ICONS.slice(0, 7).map((icon, i) => (
          <motion.img
            key={i}
            src={icon.icon}
            alt=""
            className="rounded-[22%] shadow-md"
            style={{ width: 40, height: 40 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              opacity: { duration: 0.5, delay: 0.1 + i * 0.05, ease: EASE },
              scale: { duration: 0.5, delay: 0.1 + i * 0.05, ease: EASE },
            }}
          />
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

        {showSubscribe && (
          <FadeIn delay={0.35} y={20}>
            {status === "ok" ? (
              <p className="mt-10 text-sm font-medium text-emerald-600">Check your inbox to confirm your subscription.</p>
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
                    className="relative -my-px -mr-px h-[calc(100%+2px)] shrink-0 cursor-pointer rounded-full bg-black px-5 text-sm font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50"
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
        )}
      </div>

    </section>
  );
}
