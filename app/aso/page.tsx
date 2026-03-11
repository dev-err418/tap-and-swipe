"use client";

import { motion } from "framer-motion";
import {
    ArrowRight,
    Search,
    BarChart3,
    Megaphone,
    Check,
    Star,
    ShieldCheck,
    Globe,
    Sparkles,
    Download,
    Target,
    TrendingUp,
    Eye,
    PenLine,
    Lightbulb,
    Grid3X3,
    DollarSign,
    Pause,
    Zap,
    Ban,
} from "lucide-react";

export default function AsoPage() {
    const fade = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 },
    };

    return (
        <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] font-sans selection:bg-[#f4cf8f]/30">
            {/* Hero */}
            <header className="relative overflow-hidden pt-32 pb-16">
                <div className="mx-auto max-w-7xl px-6 text-center">
                    <a
                        href="https://www.youtube.com/@ArthurBuildsStuff"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-6 flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                    >
                        <img
                            src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
                            alt="ArthurBuildsStuff"
                            className="h-8 w-8 rounded-full border border-[#f4cf8f]/20"
                        />
                        <span className="text-sm font-medium text-[#c9c4bc]">
                            By ArthurBuildsStuff
                        </span>
                    </a>

                    <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight leading-[1] sm:text-7xl">
                        Rank higher,{" "}
                        <span
                            className="text-[#f4cf8f] box-decoration-clone px-2 -mx-2"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100' preserveAspectRatio='none'%3E%3Cpath d='M2 12 Q40 6 80 10 Q130 4 170 8 Q190 5 198 2 L199 90 Q170 96 130 92 Q90 98 50 94 Q20 99 1 96 Z' fill='rgba(244,207,143,0.15)'/%3E%3C/svg%3E")`,
                                backgroundSize: "100% 100%",
                                backgroundRepeat: "no-repeat",
                            }}
                        >
                            get more downloads
                        </span>
                    </h1>

                    <p className="mx-auto mt-8 max-w-2xl text-lg text-[#c9c4bc] sm:text-xl">
                        The all-in-one macOS app for App Store Optimization.
                        Keywords, metadata, and Apple Ads in one place.
                    </p>

                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <a
                            href="#pricing"
                            className="group flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
                        >
                            Get App Sprint ASO
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </a>
                    </div>

                    <p className="mt-4 text-sm font-medium text-[#c9c4bc]">
                        Requires <span className="text-[#f4cf8f]">macOS 14.6+</span>
                    </p>

                    {/* Video placeholder */}
                    <div className="mt-16 flex justify-center">
                        <div className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-[#f4cf8f]/10 ring-1 ring-white/10">
                            {/* Replace empty string with actual video URL when ready */}
                            <div className="w-full max-w-4xl aspect-video bg-black/20" />
                        </div>
                    </div>
                </div>
            </header>

            {/* How It Works */}
            <section className="bg-[#2a2725] py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <motion.div {...fade} className="mb-16 text-center">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#f4cf8f]">
                            How it works?
                        </p>
                        <h2 className="text-5xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-7xl">
                            Grow your downloads in 3 steps
                        </h2>
                    </motion.div>

                    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 lg:max-w-none lg:flex-row lg:items-stretch lg:gap-0">
                        {[
                            {
                                step: "1",
                                title: "Research keywords",
                                description:
                                    "Find high-value keywords your competitors rank for. Track popularity, difficulty, and your position across every country.",
                                image: "/aso/step-1-keywords.png",
                            },
                            {
                                step: "2",
                                title: "Optimize your page",
                                description:
                                    "Pull your metadata from App Store Connect, edit it with smart suggestions, and push changes back in one click.",
                                image: "/aso/step-2-optimize.png",
                            },
                            {
                                step: "3",
                                title: "Scale with ads",
                                description:
                                    "Create Apple Search Ads campaigns, manage bids and budgets, and cross-reference ad performance with organic data.",
                                image: "/aso/step-3-ads.png",
                            },
                        ].flatMap((item, i, arr) => {
                            const card = (
                                <motion.div
                                    key={`card-${i}`}
                                    {...fade}
                                    transition={{ duration: 0.5, delay: i * 0.15 }}
                                    className="relative w-full lg:flex-1 lg:basis-0 lg:min-w-0 rounded-3xl border border-white/5 bg-white/5 overflow-hidden transition-all hover:bg-white/10"
                                >
                                    <div className="aspect-[16/10] overflow-hidden">
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover object-top"
                                        />
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-[#f1ebe2] mb-2">
                                            {item.step}. {item.title}
                                        </h3>
                                        <p className="text-[#c9c4bc] leading-relaxed text-sm">
                                            {item.description}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                            if (i < arr.length - 1) {
                                return [card, (
                                    <div key={`arrow-${i}`} className="shrink-0 py-2 lg:px-4 lg:py-0 flex items-center">
                                        <svg
                                            className="h-6 w-6 text-[#f4cf8f]/40 lg:hidden"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                        <svg
                                            className="hidden h-6 w-6 text-[#f4cf8f]/40 lg:block"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </div>
                                )];
                            }
                            return [card];
                        })}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="bg-[#2a2725] py-24">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="grid gap-12 md:grid-cols-3">
                        {[
                            {
                                quote: "App Sprint ASO replaced 3 tools for me. Keyword tracking, metadata editing, and ads management — all in one native Mac app. Finally.",
                                name: "Wozu",
                                site: "gfluo.com",
                            },
                            {
                                quote: "Been using App Sprint ASO for a month now. I found keywords I was completely missing and doubled my organic installs. The competitor MRR data is gold.",
                                name: "Siya",
                                site: "genppt.com",
                            },
                            {
                                quote: "The cannibalization detection alone saved me hundreds in wasted ad spend. No other ASO tool surfaces this so clearly.",
                                name: "Kai",
                                site: "blink.new",
                            },
                        ].map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="text-center"
                            >
                                <div className="mb-4 flex justify-center text-[#f4cf8f]">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="h-4 w-4 fill-current" />
                                    ))}
                                </div>
                                <p className="text-[#c9c4bc] leading-relaxed mb-4">
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                                <p className="font-bold text-[#f1ebe2]">{t.name}</p>
                                <p className="text-sm text-[#c9c4bc]/60">{t.site}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="bg-[#2a2725] py-24">
                <div className="mx-auto max-w-5xl px-6">
                    <motion.div {...fade} className="mb-16 text-center">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#f4cf8f]">
                            Features
                        </p>
                        <h2 className="text-5xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-7xl">
                            Insights that drive rankings, not complexity
                        </h2>
                    </motion.div>

                    <div className="grid gap-6 sm:grid-cols-2">
                        {[
                            {
                                title: "Check competitor MRR",
                                description:
                                    "See estimated revenue and downloads for any app on the App Store. Know exactly who's making money in your niche and how much.",
                                icon: DollarSign,
                                image: "/aso/feature-mrr.png",
                            },
                            {
                                title: "Smart keyword suggestions",
                                description:
                                    "Get AI-powered keyword recommendations based on your metadata gaps, competitor analysis, and search volume. No more guessing.",
                                icon: Sparkles,
                                image: "/aso/feature-suggestions.png",
                            },
                            {
                                title: "Cannibalization detection",
                                description:
                                    "Spot keywords where your ads are eating your organic traffic. One click to add them as negatives and stop wasting budget.",
                                icon: Ban,
                                image: "/aso/feature-cannibalization.png",
                            },
                            {
                                title: "Country opportunity scanner",
                                description:
                                    "Find countries where your keyword is popular but competition is weak. Expand to markets others haven't discovered yet.",
                                icon: Globe,
                                image: "/aso/feature-opportunity.png",
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="group rounded-3xl border border-white/5 bg-white/5 overflow-hidden transition-all hover:bg-white/10"
                            >
                                <div className="p-8">
                                    <h3 className="text-xl font-bold text-[#f1ebe2] mb-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-[#c9c4bc] leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full"
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>


            {/* Feature Deep Dive: Keyword Research & Tracking */}
            <section className="bg-[#2a2725] py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid items-center gap-12 md:grid-cols-2">
                        <motion.div {...fade}>
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4cf8f]/10">
                                <Search className="h-5 w-5 text-[#f4cf8f]" />
                            </div>
                            <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl mb-4">
                                Keyword Research & Tracking
                            </h2>
                            <p className="text-lg text-[#c9c4bc] mb-8">
                                Find the keywords that matter and track your position over time.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    { icon: Globe, text: "Track keywords across countries (popularity, difficulty, targeting label)" },
                                    { icon: TrendingUp, text: "Position tracking with historical trend charts" },
                                    { icon: BarChart3, text: "Top 10 ranking apps per keyword with ratings, revenue & review velocity" },
                                    { icon: Eye, text: "Competitor keyword discovery" },
                                    { icon: Sparkles, text: "AI-powered keyword suggestions" },
                                    { icon: Target, text: "Country Opportunity Scanner" },
                                    { icon: Download, text: "CSV export for all your data" },
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4cf8f]/10">
                                            <feature.icon className="h-3.5 w-3.5 text-[#f4cf8f]" />
                                        </div>
                                        <span className="text-[#c9c4bc] leading-relaxed">
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        <motion.div
                            {...fade}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex items-center justify-center"
                        >
                            <div className="w-full aspect-[4/3] rounded-[32px] border border-white/5 bg-white/5 flex items-center justify-center text-[#c9c4bc]/30">
                                <span className="text-sm">Screenshot placeholder</span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Feature Deep Dive: App Store Page Optimization */}
            <section className="bg-[#2a2725] py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid items-center gap-12 md:grid-cols-2">
                        <motion.div
                            {...fade}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex items-center justify-center md:order-first"
                        >
                            <div className="w-full aspect-[4/3] rounded-[32px] border border-white/5 bg-white/5 flex items-center justify-center text-[#c9c4bc]/30">
                                <span className="text-sm">Screenshot placeholder</span>
                            </div>
                        </motion.div>

                        <motion.div {...fade}>
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4cf8f]/10">
                                <PenLine className="h-5 w-5 text-[#f4cf8f]" />
                            </div>
                            <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl mb-4">
                                App Store Page Optimization
                            </h2>
                            <p className="text-lg text-[#c9c4bc] mb-8">
                                Edit your metadata with confidence and never miss a keyword opportunity.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    { icon: Download, text: "Pull live metadata directly from App Store Connect" },
                                    { icon: PenLine, text: "Edit & save directly back to ASC" },
                                    { icon: BarChart3, text: "Character counters (30 / 30 / 100)" },
                                    { icon: Lightbulb, text: "Smart suggestions: missing keywords, cannibalized terms, weight optimization" },
                                    { icon: Sparkles, text: "Tips engine: too competitive, keep, move to title" },
                                    { icon: Check, text: "Cross-reference checkmarks on tracked keywords" },
                                    { icon: Grid3X3, text: "US 10x Matrix for 10 locale keyword coverage" },
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4cf8f]/10">
                                            <feature.icon className="h-3.5 w-3.5 text-[#f4cf8f]" />
                                        </div>
                                        <span className="text-[#c9c4bc] leading-relaxed">
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Feature Deep Dive: Apple Ads Campaign Management */}
            <section className="bg-[#2a2725] py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid items-center gap-12 md:grid-cols-2">
                        <motion.div {...fade}>
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4cf8f]/10">
                                <Megaphone className="h-5 w-5 text-[#f4cf8f]" />
                            </div>
                            <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl mb-4">
                                Apple Ads Campaign Management
                            </h2>
                            <p className="text-lg text-[#c9c4bc] mb-8">
                                Run and optimize your Apple Search Ads without leaving the app.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    { icon: BarChart3, text: "Full campaign + ad group dashboard (spend, impressions, taps, installs, CPT, CPA)" },
                                    { icon: Megaphone, text: "Create campaigns & ad groups from the app" },
                                    { icon: DollarSign, text: "Edit bids, budgets, countries. Pause/enable with optimistic UI" },
                                    { icon: TrendingUp, text: "Per-keyword ad metrics alongside organic data" },
                                    { icon: Eye, text: "Keyword insights cross-referencing organic ranking with ads" },
                                    { icon: Ban, text: "Cannibalization detection with one-click negative keyword fix" },
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4cf8f]/10">
                                            <feature.icon className="h-3.5 w-3.5 text-[#f4cf8f]" />
                                        </div>
                                        <span className="text-[#c9c4bc] leading-relaxed">
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        <motion.div
                            {...fade}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex items-center justify-center"
                        >
                            <div className="w-full aspect-[4/3] rounded-[32px] border border-white/5 bg-white/5 flex items-center justify-center text-[#c9c4bc]/30">
                                <span className="text-sm">Screenshot placeholder</span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section
                id="pricing"
                className="bg-[#2a2725] py-24 relative overflow-hidden"
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-[#f4cf8f]/5 blur-[120px] pointer-events-none" />

                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">
                            Invest in your app&apos;s growth
                        </h2>
                        <p className="mt-4 text-lg text-[#c9c4bc] max-w-2xl mx-auto">
                            Everything you need to rank higher, get more downloads, and grow your revenue.
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <motion.div
                            {...fade}
                            className="relative rounded-[40px] border border-white/10 bg-white/5 p-8 md:p-12 shadow-2xl backdrop-blur-sm"
                        >
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                {/* Left: Features */}
                                <div>
                                    <h3 className="text-2xl font-bold text-[#f1ebe2] mb-8">
                                        What you get:
                                    </h3>
                                    <ul className="space-y-6">
                                        {[
                                            {
                                                title: "Keyword Research & Tracking",
                                                description: "Discover, track, and analyze keywords across all countries",
                                            },
                                            {
                                                title: "App Store Connect Integration",
                                                description: "Edit metadata and push changes directly to ASC",
                                            },
                                            {
                                                title: "Apple Ads Management",
                                                description: "Create and optimize campaigns from one dashboard",
                                            },
                                            {
                                                title: "AI-Powered Suggestions",
                                                description: "Smart keyword tips and cannibalization detection",
                                            },
                                        ].map((feature, i) => (
                                            <li key={i} className="flex gap-4">
                                                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4cf8f]/10">
                                                    <Check className="h-4 w-4 text-[#f4cf8f]" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#f1ebe2] text-sm md:text-base leading-tight">
                                                        {feature.title}
                                                    </p>
                                                    <p className="text-xs md:text-sm text-[#c9c4bc] mt-0.5">
                                                        {feature.description}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Right: Price & CTA */}
                                <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white/5 border border-white/5 text-center">
                                    <span className="text-sm font-medium text-[#c9c4bc] mb-2 uppercase tracking-widest">
                                        App Sprint ASO
                                    </span>
                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-5xl font-extrabold text-[#f1ebe2]">
                                            --€
                                        </span>
                                        <span className="text-xl text-[#c9c4bc]">/mo</span>
                                    </div>
                                    <p className="text-xs text-[#c9c4bc] mb-8">
                                        Price coming soon
                                    </p>

                                    <button
                                        disabled
                                        className="group flex w-full h-14 items-center justify-center gap-2 rounded-full bg-[#f4cf8f]/50 text-lg font-bold text-[#2a2725]/60 cursor-not-allowed shadow-lg shadow-[#f4cf8f]/5 mb-6"
                                    >
                                        <span>Coming soon</span>
                                    </button>

                                    <p className="text-xs text-[#c9c4bc] mb-4">
                                        Requires macOS 14.6+
                                    </p>

                                    <div className="flex flex-col gap-3 w-full">
                                        <div className="flex items-center justify-center gap-2 text-xs text-[#c9c4bc]">
                                            <ShieldCheck className="h-4 w-4 text-[#f4cf8f]" />
                                            Secure payment with Stripe
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-xs text-[#c9c4bc]">
                                            <div className="flex text-[#f4cf8f]">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className="h-3 w-3 fill-current"
                                                    />
                                                ))}
                                            </div>
                                            Rated 5/5 by makers
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section
                id="faq"
                className="bg-[#2a2725] py-24"
            >
                <div className="mx-auto max-w-4xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">
                            Frequently asked questions
                        </h2>
                        <p className="mt-4 text-lg text-[#c9c4bc]">
                            Everything you need to know about App Sprint ASO.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                question: "What is ASO?",
                                answer: "ASO stands for App Store Optimization. It's the process of improving your app's visibility in the App Store by optimizing keywords, metadata, and leveraging Apple Search Ads. Think of it as SEO, but for mobile apps.",
                            },
                            {
                                question: "Do I need an Apple Developer account?",
                                answer: "Yes. To pull and push metadata from App Store Connect and manage Apple Ads campaigns, you need an active Apple Developer account ($99/year from Apple).",
                            },
                            {
                                question: "Does it work with Apple Search Ads?",
                                answer: "Absolutely. App Sprint ASO integrates with the Apple Search Ads API so you can create campaigns, manage ad groups, edit bids and budgets, and cross-reference ad performance with your organic keyword data, all from one place.",
                            },
                            {
                                question: "What macOS version do I need?",
                                answer: "App Sprint ASO requires macOS 14.6 (Sonoma) or later. It's a native macOS app built with Swift and SwiftUI for the best performance.",
                            },
                            {
                                question: "Can I track competitor keywords?",
                                answer: "Yes. You can discover which keywords your competitors rank for, see their positions, and find keyword opportunities they might be missing. This works across all countries supported by the App Store.",
                            },
                        ].map((faq, i) => (
                            <details
                                key={i}
                                className="group rounded-3xl border border-white/5 bg-white/5 [&_summary::-webkit-details-marker]:hidden"
                            >
                                <summary className="flex cursor-pointer items-center justify-between gap-1.5 p-6 text-[#f1ebe2] transition hover:bg-white/5 rounded-3xl focus:outline-none">
                                    <h3 className="font-medium text-lg">
                                        {faq.question}
                                    </h3>
                                    <span className="relative h-5 w-5 shrink-0">
                                        <svg
                                            className="absolute inset-0 h-5 w-5 opacity-100 transition duration-300 group-open:rotate-180"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </span>
                                </summary>
                                <div className="px-6 pb-6 text-[#c9c4bc] leading-relaxed">
                                    <p>{faq.answer}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#2a2725] py-8">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
                    <p className="text-sm text-[#c9c4bc]">
                        &copy; {new Date().getFullYear()} Tap & Swipe. All rights
                        reserved.
                    </p>
                    <div className="flex gap-6">
                        <a
                            href="/tos"
                            className="text-sm text-[#c9c4bc] hover:text-[#f1ebe2]"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="/privacy"
                            className="text-sm text-[#c9c4bc] hover:text-[#f1ebe2]"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="/tos#refund"
                            className="text-sm text-[#c9c4bc] hover:text-[#f1ebe2]"
                        >
                            Refund Policy
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
