import {
    ArrowRight,
    Star,
} from "lucide-react";
import { FloatingAppIcons } from "./FloatingAppIcons";

const COMMUNITY_ICONS = [
    "/community-icons/calmerra.jpg",
    "/community-icons/divvy.jpg",
    "/community-icons/axiom.jpg",
    "/community-icons/bump-chat.jpg",
    "/community-icons/glow.jpg",
    "/community-icons/plume.jpg",
    "/community-icons/betme.jpg",
    "/community-icons/netpay.jpg",
    "/community-icons/revive.jpg",
    "/community-icons/daily-founder.jpg",
    "/community-icons/block-reels.jpg",
    "/community-icons/versy.jpg",
    "/community-icons/murmur.jpg",
    "/community-icons/budgetapp.jpg",
];

const TESTIMONIAL_ROWS: { name: string; text: string; time: string; image: string; highlight: string }[][] = [
    [
        {
            name: "JX_Op",
            text: "Best small community for building apps. 5 days in and Arthur has already hopped on multiple 1-on-1 calls with me. Full roadmap, and everyone's either building their own thing or helping each other out.",
            highlight: "multiple 1-on-1 calls",
            time: "10 days after purchase",
            image: "/jx_op.webp",
        },
        {
            name: "Luka",
            text: "Only a few days in and the experience is great. Arthur's super helpful, the other members are too. I never paid for a community before, but this one's worth it. Needed people more experienced than me.",
            highlight: "this one's worth it",
            time: "8 days after purchase",
            image: "/luka.webp",
        },
        {
            name: "jesse",
            text: "If you want to build apps, this is the clearest community I've found. Step-by-step instructions, constant advice, and a group of like-minded people actually shipping things.",
            highlight: "actually shipping things",
            time: "7 days after purchase",
            image: "/jesse.webp",
        },
        {
            name: "Hnythng",
            text: "Finally a place where I can share progress, ask questions, and get answers from someone at another level in the app game. Best investment I've made for my app development so far.",
            highlight: "Best investment I've made",
            time: "9 days after purchase",
            image: "/hnythng.webp",
        },
        {
            name: "Ilya",
            text: "Lots of useful materials in here, and the community is genuinely supportive. Glad I joined.",
            highlight: "genuinely supportive",
            time: "8 days after purchase",
            image: "/ilya.webp",
        },
    ],
    [
        {
            name: "user1a1a586904",
            text: "Three days in and I already submitted my first app. Arthur's insane, constant feedback, always jumping on 1:1s, sharing value nonstop. 100% recommend, whether you're no-code or dev.",
            highlight: "submitted my first app",
            time: "3 days after purchase",
            image: "/user1a1a.webp",
        },
        {
            name: "raphael",
            text: "The Discord covers everything you need to ship your first app. Arthur's super helpful and always sharing his expertise. The community itself is a huge plus for feedback too.",
            highlight: "ship your first app",
            time: "10 days after purchase",
            image: "/raphael.webp",
        },
        {
            name: "PauPi10",
            text: "This community pushed me to launch my app, and now I do this full-time. Arthur's a legend. Can't recommend it enough if you actually want to ship.",
            highlight: "I do this full-time",
            time: "1 month after purchase",
            image: "/paupi.webp",
        },
        {
            name: "Steven",
            text: "Great community run by Arthur. Tons of value, from basic learnings to more advanced ones. Shout out to Arthur for keeping it alive.",
            highlight: "Tons of value",
            time: "1 month after purchase",
            image: "/steven.webp",
        },
    ],
];

function renderHighlighted(text: string, highlight: string) {
    const idx = text.indexOf(highlight);
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <span className="underline decoration-[#FF9500] decoration-wavy decoration-[1.5px] underline-offset-[3px]">
                {text.slice(idx, idx + highlight.length)}
            </span>
            {text.slice(idx + highlight.length)}
        </>
    );
}

import { Suspense } from "react";
import Image from "next/image";
import SuccessOverlay from "./SuccessOverlay";
import ErrorOverlay from "./ErrorOverlay";
import Pricing from "./Pricing";
import FaqSection from "./FaqSection";
import PageTracker from "./PageTracker";

const LandingPage = () => {
    return (
        <>
        <div>
            <PageTracker product="community" ctaSelector='[data-fast-goal="cta_pricing_clicked"]' />
            <Suspense fallback={null}>
                <SuccessOverlay />
                <ErrorOverlay />
            </Suspense>

            {/* Hero Section */}
            <header
                className="relative flex min-h-[600px] flex-col items-center overflow-hidden px-6 text-center"
                style={{ minHeight: "max(600px, calc(100dvh - 72px))" }}
            >
                <FloatingAppIcons icons={COMMUNITY_ICONS} label="Apps built by members" hideStrip />

                {/* Top spacer */}
                <div className="flex-1" />

                {/* Centered content: badge + title + subtitle */}
                <div className="mx-auto max-w-7xl">
                    <div className="fade-in-up" style={{ animationDelay: "0.15s" }}>
                    <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
                        Build a mobile app in{" "}
                        weeks{" "}
                        <span
                            className="underline decoration-[#FF9500] decoration-wavy decoration-[4px] underline-offset-[6px]"
                        >
                            not months
                        </span>
                    </h1>
                    </div>

                    <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
                    <p className="mx-auto mt-6 max-w-xl text-base text-black/60 sm:text-lg">
                        Stop dreaming and start shipping. The complete roadmap to validating, designing, building, and scaling your own mobile app business.
                    </p>
                    </div>
                </div>

                {/* Bottom section: CTA + social proof (not affecting vertical center) */}
                <div className="flex-1 flex flex-col items-center justify-start pt-10">
                    <div className="fade-in-up" style={{ animationDelay: "0.45s" }}>
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <a
                            href="#pricing"
                            data-fast-goal="cta_hero_clicked"
                            className="group flex h-12 items-center gap-2 rounded-full bg-[#FF9500] px-8 text-base font-bold text-white transition-all hover:bg-[#FF9500]/85 hover:ring-4 hover:ring-[#FF9500]/20 cursor-pointer"
                        >
                            Get instant access
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </a>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-3">
                        <div className="flex -space-x-3">
                            {[
                                { src: "/jx_op.webp", name: "JX_Op" },
                                { src: "/luka.webp", name: "Luka" },
                                { src: "/jesse.webp", name: "Jesse" },
                                { src: "/hnythng.webp", name: "Hnythng" },
                                { src: "/raphael.webp", name: "Raphael" },
                            ].map((member, i) => (
                                <img
                                    key={i}
                                    className="h-10 w-10 rounded-full border-2 border-white object-cover"
                                    src={member.src}
                                    alt={member.name}
                                    width={40}
                                    height={40}
                                    loading="eager"
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex text-[#FF9500]">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-current" />
                                ))}
                            </div>
                            <p className="text-sm font-medium text-black/50">
                                <span className="font-bold text-black">63</span> makers building together
                            </p>
                        </div>
                    </div>
                    </div>
                </div>
            </header>

                    <div className="mx-auto max-w-7xl px-6 pb-32">
                    <div className="flex justify-center">
                        <div className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-black/10 ring-1 ring-black/10">
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

            {/* How It Works — 3 steps */}
            <section className="bg-white pt-8 pb-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
                            Ship your app in{" "}
                            <span className="underline decoration-[#FF9500] decoration-wavy decoration-[3px] underline-offset-[6px]">
                                3 steps
                            </span>
                        </h2>
                        <p className="mt-4 text-lg text-black/50 max-w-2xl mx-auto">
                            A clear path from idea to launch, without the guesswork.
                        </p>
                    </div>

                    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 lg:max-w-none lg:flex-row lg:items-stretch lg:gap-0">
                        {[
                            {
                                step: "1",
                                title: "Find your niche and build",
                                description: "Spot your niche with tips and tricks from the course, plus live input from the community. Then ship your first version fast with AI.",
                                image: "/step-find-niche.webp",
                            },
                            {
                                step: "2",
                                title: "Learn from group calls",
                                description: "Weekly group calls with makers who've been through the same thing, including live app reviews from community members.",
                                image: "/step-group-calls.webp",
                            },
                            {
                                step: "3",
                                title: "Scale and iterate",
                                description: "Grow with Apple Search Ads, TikTok ads, organic content, SEO, or ASO. Whatever works best for you and your niche.",
                                image: "/step-scale.webp",
                            },
                        ].flatMap((item, i, arr) => {
                            const card = (
                                <div
                                    key={`step-card-${i}`}
                                    className="relative w-full lg:flex-1 lg:basis-0 lg:min-w-0 rounded-3xl border border-black/10 bg-white shadow-[0_0_24px_rgba(0,0,0,0.08)] overflow-hidden"
                                >
                                    <div className="aspect-[16/10] w-full bg-black/5">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : null}
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-xl font-semibold text-black mb-2">
                                            {item.step}. {item.title}
                                        </h3>
                                        <p className="text-black/50 leading-relaxed text-sm">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            );
                            if (i < arr.length - 1) {
                                return [card, (
                                    <div key={`step-arrow-${i}`} className="shrink-0 py-2 lg:px-4 lg:py-0 flex items-center">
                                        <svg
                                            className="h-6 w-6 text-[#FF9500] lg:hidden"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                        <svg
                                            className="hidden h-6 w-6 text-[#FF9500] lg:block"
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

            {/* Testimonials Section */}
            <section id="testimonials" data-fast-scroll="scroll_to_testimonials" className="bg-white py-24 overflow-hidden">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">What makers are saying</h2>
                        <p className="mt-4 text-lg text-black/50">
                            Join the community of builders{" "}
                            <span className="underline decoration-[#FF9500] decoration-wavy decoration-[2px] underline-offset-[5px]">
                                shipping their dreams
                            </span>
                            .
                        </p>
                    </div>
                </div>

                <div
                    className="space-y-6"
                    style={{
                        WebkitMaskImage:
                            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
                        maskImage:
                            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
                    }}
                >
                    {TESTIMONIAL_ROWS.map((row, rowIndex) => (
                        <div
                            key={rowIndex}
                            className="flex w-max gap-6 pr-6"
                            style={rowIndex === 1 ? { marginLeft: "-186px" } : undefined}
                        >
                            <div className={`flex shrink-0 gap-6 ${rowIndex === 0 ? "marquee-left" : "marquee-right"}`}>
                                {[...row, ...row].map((testimonial, i) => (
                                    <div
                                        key={i}
                                        className="flex w-[360px] shrink-0 flex-col rounded-3xl border border-black/10 bg-black/[0.02] p-6"
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="flex text-[#FF9500]">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className="h-4 w-4 fill-current" />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-black/70 leading-relaxed text-sm">&ldquo;{renderHighlighted(testimonial.text, testimonial.highlight)}&rdquo;</p>
                                        <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={testimonial.image}
                                                    alt={`${testimonial.name} avatar`}
                                                    width={32}
                                                    height={32}
                                                    loading="lazy"
                                                    className="h-8 w-8 rounded-full border border-black/10 object-cover"
                                                />
                                                <span className="font-medium text-sm text-black">{testimonial.name}</span>
                                            </div>
                                            <span className="text-xs text-black/40">{testimonial.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Results Section */}
            <section id="results" data-fast-scroll="scroll_to_results" className="bg-white py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
                            Build your{" "}
                            <span className="underline decoration-[#FF9500] decoration-wavy decoration-[3px] underline-offset-[6px]">
                                passive income
                            </span>
                        </h2>
                        <p className="mt-4 text-lg text-black/50 max-w-2xl mx-auto">
                            Real numbers from makers who shipped with AppSprint.
                        </p>
                    </div>

                    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
                        {[
                            {
                                name: "PauPi",
                                quote: "Launched with AppSprint, now iterating on my paywall and running Apple Search Ads to scale.",
                                highlight: "to scale",
                                image: "/results-paupi.webp",
                            },
                            {
                                name: "Wabey",
                                quote: "Multiple $80+ days in week 2 after launching my first app, two more in the works.",
                                highlight: "$80+ days",
                                image: "/results-wabey.webp",
                            },
                            {
                                name: "Almopt",
                                quote: "Rebuilt my app as V2 in AppSprint, closing in on $2k/month from 100% organic TikTok.",
                                highlight: "$2k/month",
                                image: "/results-almopt.webp",
                            },
                        ].map((r) => (
                            <div
                                key={r.name}
                                className="flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/5 shadow-lg shadow-black/5"
                            >
                                <div className="relative aspect-[4/3] w-full bg-black/5">
                                    <Image
                                        src={r.image}
                                        alt={`${r.name}'s RevenueCat revenue screenshot`}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                    />
                                </div>
                                <div className="flex flex-1 flex-col gap-2 px-6 py-4">
                                    <p className="text-sm font-semibold text-black">{r.name}</p>
                                    <p className="text-sm text-black/60">{renderHighlighted(r.quote, r.highlight)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <Pricing />

            {/* FAQ Section */}
            <FaqSection />

        </div>
        </>
    );
};

export default LandingPage;
