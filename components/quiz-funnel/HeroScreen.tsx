"use client";

import { ArrowRight } from "lucide-react";

export default function HeroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
      <a
        href="https://www.youtube.com/@ArthurBuildsStuff"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <img
          src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
          alt="Arthur"
          className="h-8 w-8 rounded-full border border-[#f4cf8f]/20"
        />
        <span className="text-sm font-medium text-[#c9c4bc]">By Arthur</span>
      </a>

      <h1 className="text-5xl font-extrabold tracking-tight leading-[1] sm:text-7xl">
        Your app, built right{" "}
        <span
          className="text-[#f4cf8f] box-decoration-clone px-2 -mx-2"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100' preserveAspectRatio='none'%3E%3Cpath d='M2 12 Q40 6 80 10 Q130 4 170 8 Q190 5 198 2 L199 90 Q170 96 130 92 Q90 98 50 94 Q20 99 1 96 Z' fill='rgba(244,207,143,0.15)'/%3E%3C/svg%3E")`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
          }}
        >
          from strategy to launch
        </span>
      </h1>

      <p className="text-[#c9c4bc] text-lg sm:text-xl mt-4">
        Take this 2-minute quiz to get a personalized recommendation
        and find out how we can help you bring your mobile app to life.
      </p>

      <div className="mt-10">
        <button
          onClick={onStart}
          data-fast-goal="quiz_hero_start"
          className="group flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
        >
          Let&apos;s start!
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
