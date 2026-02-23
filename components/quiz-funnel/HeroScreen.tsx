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
          alt="ArthurBuildsStuff"
          className="h-8 w-8 rounded-full border border-[#f4cf8f]/20"
        />
        <span className="text-sm font-medium text-[#c9c4bc]">By ArthurBuildsStuff</span>
      </a>

      <h1 className="text-5xl font-extrabold tracking-tight leading-[0.9] sm:text-7xl">
        Get your{" "}
        action plan{" "}
        to reach{" "}
        <span className="relative inline-block text-[#f4cf8f]">
          $3K MRR
          <svg
            className="absolute -bottom-2 left-0 w-full"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
          >
            <path
              d="M0 5 Q 50 10 100 5"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-[#f4cf8f]/50"
            />
          </svg>
        </span>
      </h1>

      <p className="text-[#c9c4bc] text-lg sm:text-xl mt-4">
        Take this 2-minute quiz to discover what type of app creator you are
        and get a step-by-step plan to hit $3,000/month in recurring revenue.
      </p>

      <div className="mt-10">
        <button
          onClick={onStart}
          data-fast-goal="quiz_hero_start"
          className="group flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
        >
          Start the quiz (2 min)
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#c9c4bc]/70">
        <span>📊 100% personalized results</span>
        <span>👥 40+ devs already building with me</span>
        <span>📱 3 published & profitable apps</span>
      </div>
    </div>
  );
}
