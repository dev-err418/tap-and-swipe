"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    CheckCircle2,
} from "lucide-react";
import AIFormula from "./AIFormula";
import RevenueScaling from "./RevenueScaling";

// --- Real course categories from seed data ---
type Category = {
    id: string;
    title: string;
    emoji: string;
    description: string;
    lessons: string[];
};

const categories: Category[] = [
    {
        id: "getting-started",
        title: "Getting started",
        emoji: "🚀",
        description: "Set the right foundations before you build anything. Understand the roadmap, install the tools, and get ready to move fast.",
        lessons: [
            "Welcome to the roadmap",
            "Tools & setup",
        ],
    },
    {
        id: "find-your-idea",
        title: "Find your idea",
        emoji: "💡",
        description: "Before you write a single line of code, make sure people actually want what you're building. Use data, not gut feelings.",
        lessons: [
            "How to find app ideas that actually make money",
            "ASO basics: pick keywords that get you discovered",
            "How to structure your app name & subtitle",
            "The 3-day validation test",
        ],
    },
    {
        id: "design",
        title: "Design",
        emoji: "🎨",
        description: "Great apps don't just look pretty — they guide users toward a purchase. Study what works, then make it yours.",
        lessons: [
            "Design your app without being a designer",
            "Design an onboarding that converts",
            "Your first App Store screenshot is everything",
        ],
    },
    {
        id: "build",
        title: "Build",
        emoji: "💻",
        description: "You don't need to be a 10x developer. With AI tools and the right stack, you can build production-quality apps fast.",
        lessons: [
            "From zero to running app with Expo + AI tools",
            "App Store Connect setup",
            "Submitting your first build to TestFlight",
            "Set up Sentry, PostHog & Supabase",
        ],
    },
    {
        id: "monetize",
        title: "Monetize",
        emoji: "💳",
        description: "The difference between a hobby project and a business is a paywall. Set it up right from day one.",
        lessons: [
            "Set up subscriptions with RevenueCat",
            "Paywall strategy: the 3-step onboarding that converts",
            "AB test everything",
            "Price smarter: localized pricing with PriceLocalize",
        ],
    },
    {
        id: "launch-and-grow",
        title: "Launch & grow",
        emoji: "📈",
        description: "Organic traffic gets you started. Paid acquisition and viral loops scale you up. Learn both.",
        lessons: [
            "ASO after launch",
            "Apple Ads: your first campaign setup",
            "Target any country on TikTok with a VPN",
            "Warm up a fresh TikTok account",
        ],
    },
];

const Roadmap = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (!isAutoPlaying) return;

        const timer = setInterval(() => {
            setActiveTab((current) => (current + 1) % categories.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [isAutoPlaying]);

    const handleTabClick = (index: number) => {
        setIsAutoPlaying(false);
        setActiveTab(index);
    };

    return (
        <section id="roadmap" data-fast-scroll="scroll_to_roadmap" className="bg-[#2a2725] py-24 border-t border-white/5 overflow-hidden">
            <div className="mx-auto max-w-7xl px-6">

                {/* 1. Horizontal Simplified Timeline */}
                <div className="relative mb-20 overflow-x-auto pb-8 -mx-6 px-6 no-scrollbar">
                    <div className="min-w-[860px] mx-auto relative">
                        {/* Horizontal Line */}
                        <div className="absolute top-[5.5rem] left-0 w-full h-px bg-white/10" />

                        <div className="grid grid-cols-6 gap-4">
                            {categories.map((cat, i) => (
                                <motion.div
                                    key={cat.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="relative flex flex-col items-center text-center"
                                >
                                    {/* Emoji */}
                                    <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5 shadow-sm">
                                        <span className="text-4xl">{cat.emoji}</span>
                                    </div>

                                    {/* Dot on line */}
                                    <div className="absolute top-[5.2rem] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#2a2725] border-4 border-[#2a2725] z-10">
                                        <div className="w-full h-full rounded-full bg-[#f4cf8f]" />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-lg font-bold text-[#f1ebe2] mb-1 font-serif">
                                        {i + 1}. {cat.title}
                                    </h3>
                                    <p className="text-[#c9c4bc] text-xs max-w-[140px] leading-relaxed">
                                        {cat.lessons.length} lesson{cat.lessons.length !== 1 ? "s" : ""}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Revenue Scaling Visualization */}
                <div className="mb-24">
                    <RevenueScaling />
                </div>


            </div>

            {/* Full-width divider */}
            <hr className="border-white/5 mb-24" />

            <div className="mx-auto max-w-7xl px-6 pt-4">

                {/* Section header */}
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">
                        The full App Sprint roadmap
                    </h2>
                    <p className="mt-4 text-lg text-[#c9c4bc]">
                        6 modules, 21 lessons — from first idea to first revenue on the App Store
                    </p>
                    <p className="mt-3 text-sm text-[#c9c4bc]/70">
                        Here&apos;s exactly what you get when you join.
                    </p>
                </div>

                {/* 2. Tabbed Detailed View */}
                <div className="max-w-5xl mx-auto">
                    {/* Tabs */}
                    <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12 border-b border-white/10 pb-8">
                        {categories.map((cat, index) => {
                            const isActive = activeTab === index;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => handleTabClick(index)}
                                    className={`group flex flex-col items-center gap-3 transition-all duration-300 outline-none cursor-pointer ${isActive ? "text-[#f4cf8f] scale-105" : "text-[#c9c4bc] hover:text-[#f1ebe2]"
                                        }`}
                                >
                                    <div className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all ${isActive
                                        ? "bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 shadow-[0_0_15px_rgba(244,207,143,0.1)]"
                                        : "bg-white/5 border border-transparent group-hover:bg-white/10"
                                        }`}>
                                        <span className="text-2xl">{cat.emoji}</span>
                                    </div>
                                    <span className="text-sm font-medium">{cat.title}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Content */}
                    <div className="min-h-[400px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="max-w-xl mx-auto"
                            >
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 text-[#f4cf8f] text-xs font-bold uppercase tracking-wider mb-6">
                                        <Sparkles className="h-3 w-3" />
                                        {categories[activeTab].lessons.length} lesson{categories[activeTab].lessons.length !== 1 ? "s" : ""}
                                    </div>

                                    <h3 className="text-3xl font-serif font-bold text-[#f1ebe2] mb-4">
                                        {categories[activeTab].title}
                                    </h3>
                                    <p className="text-[#c9c4bc] text-lg leading-relaxed mb-8">
                                        {categories[activeTab].description}
                                    </p>

                                    <div className="space-y-4">
                                        {categories[activeTab].lessons.map((lesson, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <CheckCircle2 className="h-5 w-5 text-[#f4cf8f] shrink-0 mt-0.5" />
                                                <span className="text-[#f1ebe2]/90">{lesson}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Watch a preview button */}
                    <div className="mt-12 flex justify-center">
                        <button
                            onClick={() => setShowPreview(true)}
                            className="group flex items-center gap-2 rounded-full bg-[#f4cf8f] px-6 py-3 text-sm font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
                        >
                            <span className="text-lg">👀</span>
                            Watch a preview
                        </button>
                    </div>

                    {/* Video modal */}
                    <AnimatePresence>
                        {showPreview && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                                onClick={() => setShowPreview(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    transition={{ type: "spring", duration: 0.4 }}
                                    className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <iframe
                                        src="https://www.youtube.com/embed/Zq37It_smAk?autoplay=1"
                                        title="Welcome to the roadmap"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 h-full w-full"
                                    />
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* AI Formula Visualization */}
                <div className="mt-24 pt-24 border-t border-white/5">
                    <AIFormula />
                </div>

            </div>
        </section>
    );
};

export default Roadmap;
