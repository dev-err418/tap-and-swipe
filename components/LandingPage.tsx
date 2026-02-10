"use client";

import React from "react";
import {
    Lightbulb,
    Palette,
    Code,
    CreditCard,
    TrendingUp,
    ArrowRight,
    CheckCircle2,
    Play
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DiscordIcon = ({ className }: { className?: string }) => (
    <svg
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        className={className}
    >
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
);

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">

            {/* Hero Section */}
            <header className="relative overflow-hidden pt-20 pb-32">
                <div className="mx-auto max-w-7xl px-6 text-center">
                    <Badge className="mb-6 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400 hover:bg-orange-500/20">
                        <span className="mr-2">🚀</span> New Course Available
                    </Badge>
                    <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight leading-[0.9] sm:text-7xl">
                        Build a mobile app in <br />
                        weeks <span className="relative inline-block font-serif text-6xl text-orange-500 sm:text-8xl">
                            not months
                            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" className="text-orange-900/50" />
                            </svg>
                        </span>
                    </h1>
                    <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-400 sm:text-xl">
                        Stop dreaming and start shipping. The complete guide to validating, designing, building, and scaling your own mobile app business.
                    </p>

                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <a
                            href="https://discord.gg/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex h-12 items-center gap-2 rounded-full bg-[#5865F2] px-8 text-base font-semibold text-white transition-all hover:bg-[#4752C4] hover:ring-4 hover:ring-[#5865F2]/20 cursor-pointer"
                        >
                            <DiscordIcon className="h-5 w-5" />
                            Join the Community
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </a>
                    </div>


                    <div className="mt-16 flex justify-center">
                        <div className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-orange-500/10 ring-1 ring-white/10">
                            <video
                                src="https://assets.whop.com/uploads-optimized/2026-02-05/10143289-4fe6-4555-b43e-26d66a821835.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                className="w-full max-w-4xl"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Bento Grid Section */}
            <section id="curriculum" className="bg-black py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything you need to launch</h2>
                        <p className="mt-4 text-lg text-gray-400">From just an idea to your first paying customer.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4 lg:grid-rows-2">

                        {/* 1. Idea Validation (Large square) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-zinc-900/50 p-8 shadow-sm transition-all hover:bg-zinc-900 hover:shadow-md md:col-span-2 md:row-span-2 border border-white/5">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl"></div>
                            <div className="relative z-10">
                                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                    <Lightbulb className="h-6 w-6" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">Idea Validation</h3>
                                <p className="mt-4 text-gray-400 leading-relaxed">
                                    Don't waste time building something nobody wants. Learn how to find profitable niches, interview potential users, and pre-sell your app before writing a single line of code.
                                </p>
                                <ul className="mt-8 space-y-3">
                                    {['Market Research Framework', 'The "Mom Test" Approach', 'Landing Page Testing'].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-sm font-medium text-gray-300">
                                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-500"></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* 2. Design UI & UX (Horizontal rectangle) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-zinc-900/50 p-8 shadow-sm transition-all hover:bg-zinc-900 hover:shadow-md md:col-span-2 border border-white/5">
                            <div className="absolute bottom-0 right-0 -mb-8 -mr-8 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl"></div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                <div>
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                        <Palette className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Design UI & UX</h3>
                                    <p className="mt-2 text-sm text-gray-400">Create beautiful, intuitive interfaces that users love.</p>
                                </div>
                                {/* Abstract UI representation */}
                                <div className="flex gap-2">
                                    <div className="h-16 w-12 rounded-lg bg-white/5 border border-white/10 shadow-sm animate-pulse"></div>
                                    <div className="h-16 w-12 rounded-lg bg-pink-500/10 border border-pink-500/20 shadow-sm"></div>
                                    <div className="h-16 w-12 rounded-lg bg-white/5 border border-white/10 shadow-sm"></div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Development Guide (Vertical rectangle) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-black p-8 shadow-sm transition-all hover:shadow-md md:col-span-1 border border-zinc-800">
                            <div className="relative z-10 text-white">
                                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-gray-200 border border-zinc-700">
                                    <Code className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold">Development</h3>
                                <p className="mt-2 text-sm text-gray-400">React Native / Expo</p>
                                <div className="mt-8 space-y-2">
                                    <div className="h-2 w-full rounded-full bg-zinc-800"></div>
                                    <div className="h-2 w-3/4 rounded-full bg-zinc-800"></div>
                                    <div className="h-2 w-1/2 rounded-full bg-zinc-700"></div>
                                </div>
                                <div className="mt-6 rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-xs text-green-400">
                                    $ npx create-expo-app
                                </div>
                            </div>
                        </div>

                        {/* 4. Paywall (Small square) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-zinc-900/50 p-8 shadow-sm transition-all hover:bg-zinc-900 hover:shadow-md md:col-span-1 border border-white/5">
                            <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-green-500/10 opacity-50"></div>
                            <div className="relative z-10">
                                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Cashing in</h3>
                                <p className="mt-2 text-sm text-gray-400">Stripe & RevenueCat.</p>
                            </div>
                        </div>

                        {/* 5. Marketing & Growth (Small square) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-orange-600 p-8 shadow-sm transition-all hover:bg-orange-600 hover:shadow-md md:col-span-2 border border-orange-500 text-white">
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white border border-white/20">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-xl font-bold">Marketing & Growth</h3>
                                    <p className="mt-2 text-sm text-white/80">Scale to your first 1,000 users.</p>
                                </div>
                                <div className="text-4xl font-bold opacity-20">10x</div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

        </div>
    );
};

export default LandingPage;
