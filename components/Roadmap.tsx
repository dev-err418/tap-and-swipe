"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
} from "lucide-react";
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
        description: "Great apps don't just look pretty. They guide users toward a purchase. Study what works, then make it yours.",
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
            "Target the US (or any country) on TikTok with a proxy",
            "Warm up a fresh TikTok account",
            "What to post on TikTok",
            "What to post on Instagram",
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
        <section id="roadmap" data-fast-scroll="scroll_to_roadmap" className="bg-white py-24 border-t border-black/10 overflow-hidden">
            <div className="mx-auto max-w-7xl px-6">

                {/* Revenue Scaling Visualization */}
                <div className="mb-24">
                    <RevenueScaling />
                </div>

            </div>

            {/* Full-width divider */}
            <hr className="border-black/10 mb-24" />

            <div className="mx-auto max-w-7xl px-6 pt-4">

                {/* Section header */}
                <div className="mb-16 text-center">
                    <h2 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
                        The full AppSprint roadmap
                    </h2>
                    <p className="mt-4 text-lg text-black/50">
                        6 modules, 23 lessons. From first idea to first revenue on the App Store.
                    </p>
                </div>

                {/* 2. Tabbed Detailed View */}
                <div className="max-w-5xl mx-auto">
                    {/* Tabs */}
                    <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12 border-b border-black/10 pb-8">
                        {categories.map((cat, index) => {
                            const isActive = activeTab === index;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => handleTabClick(index)}
                                    className={`group flex flex-col items-center gap-3 transition-all duration-300 outline-none cursor-pointer ${isActive ? "text-black scale-105" : "text-black/40 hover:text-black/70"
                                        }`}
                                >
                                    <div className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all ${isActive
                                        ? "bg-black/10 border border-black/20"
                                        : "bg-black/[0.03] border border-transparent group-hover:bg-black/[0.06]"
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
                                    <span className="inline-flex items-center rounded-full border border-black/15 bg-black/[0.03] px-3 py-1 text-xs text-black/60 mb-6">
                                        {categories[activeTab].lessons.length} lesson{categories[activeTab].lessons.length !== 1 ? "s" : ""}
                                    </span>

                                    <h3 className="text-3xl font-bold text-black mb-4">
                                        {categories[activeTab].title}
                                    </h3>
                                    <p className="text-black/50 text-lg leading-relaxed mb-8">
                                        {categories[activeTab].description}
                                    </p>

                                    <div className="space-y-4">
                                        {categories[activeTab].lessons.map((lesson, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <CheckCircle2 className="h-5 w-5 text-black shrink-0 mt-0.5" />
                                                <span className="text-black/70">{lesson}</span>
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
                            className="group flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition-all hover:bg-black/85 hover:ring-4 hover:ring-black/20 cursor-pointer"
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

            </div>
        </section>
    );
};

export default Roadmap;
