"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    CheckCircle2,
} from "lucide-react";
import AIFormula from "./AIFormula";
import RevenueScaling from "./RevenueScaling";

// --- Horizontal Timeline Data (matches tabs below) ---
const horizontalMilestones = [
    {
        day: "Week 1",
        title: "Find a profitable idea",
        emoji: "💡",
    },
    {
        day: "Week 2",
        title: "Design screens that convert",
        emoji: "🎨",
    },
    {
        day: "Week 3-4",
        title: "Build with AI speed",
        emoji: "💻",
    },
    {
        day: "Week 5",
        title: "Recurring revenue setup",
        emoji: "💳",
    },
    {
        day: "Week 6+",
        title: "Scale to 1,000 users",
        emoji: "📈",
    },
];

// --- Detailed Steps Data ---
type Step = {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    bullets: string[];
    tools: string[];
    emoji: string;
    timeSaved: string;
};

const steps: Step[] = [
    {
        id: "idea",
        title: "Idea & Validation",
        subtitle: "Find a profitable idea",
        description: "Before you write a single line of code, make sure people actually want what you're building. Use data, not gut feelings.",
        bullets: [
            "Find high-traffic keywords with Astro",
            "Check competitor revenue to validate demand",
            "Structure your app name and metadata for ASO",
            "Validate with a 3-day keyword boost",
        ],
        tools: ["Astro", "Claude"],
        emoji: "💡",
        timeSaved: "2 weeks",
    },
    {
        id: "design",
        title: "Design UI/UX",
        subtitle: "Design screens that convert",
        description: "Great apps don't just look pretty — they guide users toward a purchase. Study what works, then make it yours.",
        bullets: [
            "Design in Figma with AI-assisted workflows",
            "Study top-performing apps on Mobbin",
            "Use proven UI patterns that convert",
            "Make your CTAs impossible to miss",
        ],
        tools: ["Figma", "Mobbin", "Dribbble"],
        emoji: "🎨",
        timeSaved: "1 week",
    },
    {
        id: "dev",
        title: "Development",
        subtitle: "Build with AI speed",
        description: "You don't need to be a 10x developer. With AI tools and the right stack, you can build production-quality apps fast.",
        bullets: [
            "Build with Expo & React Native",
            "Use AI coding tools to move 10x faster",
            "Set up Sentry for crash monitoring",
            "Add Posthog analytics & Supabase backend",
        ],
        tools: ["Expo", "Claude", "Cursor", "Supabase"],
        emoji: "💻",
        timeSaved: "4 weeks",
    },
    {
        id: "paywall",
        title: "Monetization",
        subtitle: "Recurring revenue setup",
        description: "The difference between a hobby project and a business is a paywall. Set it up right from day one.",
        bullets: [
            "Set up RevenueCat & Superwall paywalls",
            "Localize pricing with PriceLocalize",
            "A/B test paywalls for maximum conversion",
            "Optimize trial length and copy",
        ],
        tools: ["RevenueCat", "Superwall"],
        emoji: "💳",
        timeSaved: "1 week",
    },
    {
        id: "growth",
        title: "Marketing",
        subtitle: "Scale to 1,000 users",
        description: "Organic traffic gets you started. Paid acquisition and viral loops scale you up. Learn both.",
        bullets: [
            "ASO with Astro keyword tracking",
            "Apple Search Ads for targeted installs",
            "TikTok geo-targeting for viral reach",
            "Double down on what works",
        ],
        tools: ["Astro", "Apple Ads", "TikTok"],
        emoji: "📈",
        timeSaved: "Ongoing",
    },
];

// Tool name to icon file mapping
const toolIcons: Record<string, string> = {
    "Astro": "/icons/astro.png",

    "Figma": "/icons/figma.png",
    "Mobbin": "/icons/mobbin.png",
    "Dribbble": "/icons/dribbble.png",
    "Expo": "/icons/expo.png",
    "Claude": "/icons/claude.png",
    "Cursor": "/icons/cursor.png",
    "Supabase": "/icons/supabase.png",
    "RevenueCat": "/icons/revenuecat.png",
    "Superwall": "/icons/superwall.png",
    "Apple Ads": "/icons/apple.png",
    "TikTok": "/icons/tiktok.png",
};

const Roadmap = () => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <section id="roadmap" className="bg-[#2a2725] py-24 border-t border-white/5 overflow-hidden">
            <div className="mx-auto max-w-7xl px-6">

                {/* Section header */}
                <div className="mb-20 text-center">
                    <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">
                        Everything you need to launch
                    </h2>
                    <p className="mt-4 text-lg text-[#c9c4bc]">
                        From idea to first dollar. 5 steps, all doable with AI.
                    </p>
                </div>

                {/* 1. Horizontal Simplified Timeline */}
                <div className="relative mb-20 hidden md:block">
                    {/* Horizontal Line */}
                    <div className="absolute top-[5.5rem] left-0 w-full h-px bg-white/10" />

                    <div className="grid grid-cols-5 gap-4">
                        {horizontalMilestones.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="relative flex flex-col items-center text-center"
                            >
                                {/* Emoji */}
                                <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5 shadow-sm transition-transform hover:scale-110">
                                    <span className="text-4xl">{step.emoji}</span>
                                </div>

                                {/* Dot on line */}
                                <div className="absolute top-[5.2rem] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#2a2725] border-4 border-[#2a2725] z-10">
                                    <div className="w-full h-full rounded-full bg-[#f4cf8f]" />
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-bold text-[#f1ebe2] mb-2 font-serif">{step.day}</h3>
                                <p className="text-[#c9c4bc] text-sm max-w-[220px] leading-relaxed">{step.title}</p>
                            </motion.div>
                        ))}
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

                {/* 2. Tabbed Detailed View */}
                <div className="max-w-5xl mx-auto">
                    {/* Tabs */}
                    <div className="flex flex-wrap justify-center gap-4 md:gap-12 mb-12 border-b border-white/10 pb-8">
                        {steps.map((step, index) => {
                            const isActive = activeTab === index;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => setActiveTab(index)}
                                    className={`group flex flex-col items-center gap-3 transition-all duration-300 outline-none cursor-pointer ${isActive ? "text-[#f4cf8f] scale-105" : "text-[#c9c4bc] hover:text-[#f1ebe2]"
                                        }`}
                                >
                                    <div className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all ${isActive
                                        ? "bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 shadow-[0_0_15px_rgba(244,207,143,0.1)]"
                                        : "bg-white/5 border border-transparent group-hover:bg-white/10"
                                        }`}>
                                        <span className="text-2xl">{step.emoji}</span>
                                    </div>
                                    <span className="text-sm font-medium">{step.title}</span>
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
                                className="grid md:grid-cols-2 gap-12 items-start"
                            >
                                {/* Left: Content */}
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 text-[#f4cf8f] text-xs font-bold uppercase tracking-wider mb-6">
                                        <Sparkles className="h-3 w-3" />
                                        Step {activeTab + 1}
                                    </div>

                                    <h3 className="text-3xl font-serif font-bold text-[#f1ebe2] mb-4">
                                        {steps[activeTab].title}
                                    </h3>
                                    <p className="text-[#c9c4bc] text-lg leading-relaxed mb-8">
                                        {steps[activeTab].description}
                                    </p>

                                    <div className="space-y-4">
                                        {steps[activeTab].bullets.map((bullet, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <CheckCircle2 className="h-5 w-5 text-[#f4cf8f] shrink-0 mt-0.5" />
                                                <span className="text-[#f1ebe2]/90">{bullet}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-2 text-[#f4cf8f]">
                                        <span className="text-sm font-medium text-[#c9c4bc]">Time saved:</span>
                                        <span className="font-bold">{steps[activeTab].timeSaved}</span>
                                    </div>
                                </div>

                                {/* Right: Tools & Visuals (Placeholder like the image style) */}
                                <div className="bg-white/5 rounded-3xl border border-white/5 p-8 h-full flex flex-col justify-center">
                                    <h4 className="text-sm font-medium text-[#c9c4bc] uppercase tracking-wider mb-6">Tools we use</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {steps[activeTab].tools.map((tool) => (
                                            <div key={tool} className="flex items-center gap-3 p-4 rounded-xl bg-[#2a2725] border border-white/5">
                                                {toolIcons[tool] ? (
                                                    <img src={toolIcons[tool]} alt={tool} className="h-5 w-5 rounded-lg opacity-80" />
                                                ) : (
                                                    <div className="h-2 w-2 rounded-full bg-[#f4cf8f]" />
                                                )}
                                                <span className="font-medium text-[#f1ebe2]">{tool}</span>
                                            </div>
                                        ))}
                                    </div>


                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
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
