import {
    ArrowRight,
    Check,
    Star,
    Globe,
    Sparkles,
    DollarSign,
    Ban,
} from "lucide-react";
import SubscribeButton from "./subscribe-button";

export default function AsoPage() {
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
                    <div className="mb-16 text-center">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#f4cf8f]">
                            How it works?
                        </p>
                        <h2 className="text-5xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-7xl">
                            Grow your downloads in 3 steps
                        </h2>
                    </div>

                    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 lg:max-w-none lg:flex-row lg:items-stretch lg:gap-0">
                        {[
                            {
                                step: "1",
                                title: "Research keywords",
                                description:
                                    "Find high-value keywords your competitors rank for. Track popularity, difficulty, and your position across every country.",
                                image: "/aso/step-1-keywords.webp",
                            },
                            {
                                step: "2",
                                title: "Optimize your page",
                                description:
                                    "Pull your metadata from App Store Connect, edit it with smart suggestions, and push changes back in one click.",
                                image: "/aso/step-2-optimize.webp",
                            },
                            {
                                step: "3",
                                title: "Scale with ads",
                                description:
                                    "Create Apple Search Ads campaigns, manage bids and budgets, and cross-reference ad performance with organic data.",
                                image: "/aso/step-3-ads.webp",
                            },
                        ].flatMap((item, i, arr) => {
                            const card = (
                                <div
                                    key={`card-${i}`}
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
                                </div>
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
                                quote: <><span className="text-[#f4cf8f] box-decoration-clone px-1 -mx-1" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100' preserveAspectRatio='none'%3E%3Cpath d='M2 12 Q40 6 80 10 Q130 4 170 8 Q190 5 198 2 L199 90 Q170 96 130 92 Q90 98 50 94 Q20 99 1 96 Z' fill='rgba(244,207,143,0.15)'/%3E%3C/svg%3E")`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}>Keyword research is effortless.</span> Download data, category insights, and country guidance all in one place. The Ads section is a game-changer: 10x clearer than Apple{"'"}s dashboard and way faster.</>,
                                name: "Pau",
                                flag: "🇪🇸",
                                site: "Restory",
                                url: "https://apps.apple.com/es/app/fix-old-photos-ai-restory/id6757200644",
                            },
                            {
                                quote: <>I{"'"}ve tried every ASO tool out there. Astro, AppTweak, you name it. None of them come close to what App Sprint does. Simply put: <span className="text-[#f4cf8f] box-decoration-clone px-1 -mx-1" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100' preserveAspectRatio='none'%3E%3Cpath d='M2 12 Q40 6 80 10 Q130 4 170 8 Q190 5 198 2 L199 90 Q170 96 130 92 Q90 98 50 94 Q20 99 1 96 Z' fill='rgba(244,207,143,0.15)'/%3E%3C/svg%3E")`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}>the app dev{"'"}s best friend.</span></>,
                                name: "Daniel",
                                flag: "",
                                site: "",
                                url: "",
                            },
                            {
                                quote: "The cannibalization detection alone saved me hundreds in wasted ad spend. No other ASO tool surfaces this so clearly.",
                                name: "Kai",
                                flag: "",
                                site: "blink.new",
                                url: "",
                            },
                        ].map((t, i) => (
                            <div
                                key={i}
                                className="text-center"
                            >
                                <div className="mb-4 flex justify-center gap-1 text-[#f4cf8f]">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="h-4 w-4 fill-current" />
                                    ))}
                                </div>
                                <p className="text-[#c9c4bc] leading-relaxed mb-4">
                                    {t.quote}
                                </p>
                                <div className="flex items-center justify-center gap-3">
                                    {t.flag && <span className="text-3xl">{t.flag}</span>}
                                    <div className={t.flag ? "text-left" : ""}>
                                        <p className="font-bold text-[#f1ebe2] leading-tight">{t.name}</p>
                                        {t.url ? (
                                            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#c9c4bc]/60 hover:text-[#f4cf8f] transition-colors">{t.site}</a>
                                        ) : (
                                            <p className="text-sm text-[#c9c4bc]/60">{t.site}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="bg-[#2a2725] py-24">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="mb-16 text-center">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#f4cf8f]">
                            Features
                        </p>
                        <h2 className="text-5xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-7xl">
                            Insights that drive rankings, not complexity
                        </h2>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                        {[
                            {
                                title: "Check competitor MRR",
                                description:
                                    "See estimated revenue and downloads for any app on the App Store. Know exactly who's making money in your niche and how much.",
                                icon: DollarSign,
                                image: "/aso/feature-mrr.webp",
                            },
                            {
                                title: "Smart keyword suggestions",
                                description:
                                    "Get AI-powered keyword recommendations based on your metadata gaps, competitor analysis, and search volume. No more guessing.",
                                icon: Sparkles,
                                image: "/aso/feature-suggestions.webp",
                            },
                            {
                                title: "Cannibalization detection",
                                description:
                                    "Spot keywords where your ads are eating your organic traffic. One click to add them as negatives and stop wasting budget.",
                                icon: Ban,
                                image: "/aso/feature-cannibalization.webp",
                            },
                            {
                                title: "Country opportunity scanner",
                                description:
                                    "Find countries where your keyword is popular but competition is weak. Expand to markets others haven't discovered yet.",
                                icon: Globe,
                                image: "/aso/feature-opportunity.webp",
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
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
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* Feature Deep Dives commented out for now
            <section> ... Keyword Research & Tracking ... </section>
            <section> ... App Store Page Optimization ... </section>
            <section> ... Apple Ads Campaign Management ... </section>
            */}

            {/* Pricing */}
            <section
                id="pricing"
                className="bg-[#2a2725] py-24"
            >
                <div className="mx-auto max-w-3xl px-6">
                    <div
                        className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 md:p-12"
                    >
                        <div className="grid md:grid-cols-2 gap-10 items-center">
                            {/* Left: Features */}
                            <div>
                            <p className="text-lg font-bold text-[#c9c4bc] mb-6">
                                Everything included. No tiers, no upsells.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Keyword research, keyword suggestions & tracking across all countries",
                                    "Competitor MRR & download estimates",
                                    "Cannibalization detection",
                                    "App Store Connect metadata editing",
                                    "Apple Search Ads management",
                                    "Unlimited keywords & apps",
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#f4cf8f]" />
                                        <span className="text-sm text-[#c9c4bc]">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            </div>

                            {/* Right: Price & CTA */}
                            <div className="text-center">
                                <span
                                    className="inline-block text-xs font-bold uppercase tracking-wider text-[#f4cf8f] bg-[#f4cf8f]/10 px-3 py-1 rounded-full mb-4 animate-pulse"
                                >
                                    -33% launch offer
                                </span>
                                <div className="flex items-baseline justify-center gap-1 mb-2">
                                    <span className="text-6xl font-extrabold text-[#f1ebe2]">
                                        6&euro;
                                    </span>
                                    <span className="text-lg text-[#c9c4bc]">/month</span>
                                </div>
                                <p className="text-sm mb-8">
                                    <span className="text-[#c9c4bc]/50">Billed annually at 72&euro;</span>
                                    <span className="text-[#c9c4bc]/50"> &middot; Tax may apply</span>
                                </p>
                                <SubscribeButton />
                                <p className="text-xs text-[#c9c4bc]/60">
                                    Single computer license &middot; macOS 14.6+
                                </p>
                            </div>
                        </div>
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
                        <h2 className="text-5xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-7xl">
                            Frequently asked questions
                        </h2>
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
                            href="/aso/terms"
                            className="text-sm text-[#c9c4bc] hover:text-[#f1ebe2]"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="/aso/privacy"
                            className="text-sm text-[#c9c4bc] hover:text-[#f1ebe2]"
                        >
                            Privacy Policy
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
