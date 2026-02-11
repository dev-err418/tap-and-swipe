"use client";

import { motion } from "framer-motion";
import {
    Settings,
    Server,
    CreditCard,
    Rocket,
    Lightbulb,
    Palette,
    Code,
    TrendingUp,
    Sparkles,
    DollarSign,
} from "lucide-react";
import {
    AstroToolLogo,
    ChatGPTLogo,
    FigmaLogo,
    MobbinLogo,
    DribbbleLogo,
    ExpoLogo,
    ClaudeLogo,
    CursorLogo,
    SentryLogo,
    PosthogLogo,
    SupabaseLogo,
    RevenueCatLogo,
    SuperwallLogo,
    PriceLocalizeLogo,
    AppleLogo,
    TikTokLogo,
} from "./tool-logos";

// --- Horizontal Timeline Data ---
const horizontalMilestones = [
    {
        day: "Day 1",
        title: "Learn the fundamentals of coding",
        Icon: Settings,
    },
    {
        day: "Day 4",
        title: "Log in users and save in database",
        Icon: Server,
    },
    {
        day: "Day 9",
        title: "Set up subscription payments",
        Icon: CreditCard,
    },
    {
        day: "Day 14",
        title: "Launch your idea!",
        Icon: Rocket,
    },
];

// --- Detailed Vertical Timeline Data ---
type Tool = {
    name: string;
    Logo: React.ComponentType<{ className?: string }>;
};

type Step = {
    number: number;
    title: string;
    subtitle: string;
    description: string;
    bullets: string[];
    tools: Tool[];
    color: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    Icon: React.ComponentType<{ className?: string }>;
};

const steps: Step[] = [
    {
        number: 1,
        title: "Idea & Validation",
        subtitle: "Find and validate a profitable app idea",
        description:
            "Before you write a single line of code, make sure people actually want what you're building. Use data, not gut feelings.",
        bullets: [
            "Find high-traffic keywords with Astro",
            "Check competitor revenue to validate demand",
            "Structure your app name and metadata for ASO",
            "Validate with a 3-day keyword boost",
        ],
        tools: [
            { name: "Astro", Logo: AstroToolLogo },
            { name: "ChatGPT", Logo: ChatGPTLogo },
        ],
        color: "#f4cf8f",
        colorClass: "text-[#f4cf8f]",
        bgClass: "bg-[#f4cf8f]/10",
        borderClass: "border-[#f4cf8f]/20",
        Icon: Lightbulb,
    },
    {
        number: 2,
        title: "Design UI/UX",
        subtitle: "Design screens that convert",
        description:
            "Great apps don't just look pretty — they guide users toward a purchase. Study what works, then make it yours.",
        bullets: [
            "Design in Figma with AI-assisted workflows",
            "Study top-performing apps on Mobbin",
            "Use proven UI patterns that convert",
            "Make your CTAs impossible to miss",
        ],
        tools: [
            { name: "Figma", Logo: FigmaLogo },
            { name: "Mobbin", Logo: MobbinLogo },
            { name: "Dribbble", Logo: DribbbleLogo },
        ],
        color: "#ec4899",
        colorClass: "text-pink-500",
        bgClass: "bg-pink-500/10",
        borderClass: "border-pink-500/20",
        Icon: Palette,
    },
    {
        number: 3,
        title: "Development",
        subtitle: "Ship your app with AI doing the heavy lifting",
        description:
            "You don't need to be a 10x developer. With AI tools and the right stack, you can build production-quality apps fast.",
        bullets: [
            "Build with Expo & React Native",
            "Use AI coding tools to move 10x faster",
            "Set up Sentry for crash monitoring",
            "Add Posthog analytics & Supabase backend",
        ],
        tools: [
            { name: "Expo", Logo: ExpoLogo },
            { name: "Claude", Logo: ClaudeLogo },
            { name: "Cursor", Logo: CursorLogo },
            { name: "Sentry", Logo: SentryLogo },
            { name: "Posthog", Logo: PosthogLogo },
            { name: "Supabase", Logo: SupabaseLogo },
        ],
        color: "#c084fc",
        colorClass: "text-purple-400",
        bgClass: "bg-purple-400/10",
        borderClass: "border-purple-400/20",
        Icon: Code,
    },
    {
        number: 4,
        title: "Paywall & Monetization",
        subtitle: "Turn downloads into recurring revenue",
        description:
            "The difference between a hobby project and a business is a paywall. Set it up right from day one.",
        bullets: [
            "Set up RevenueCat & Superwall paywalls",
            "Localize pricing with PriceLocalize",
            "A/B test paywalls for maximum conversion",
            "Optimize trial length and copy",
        ],
        tools: [
            { name: "RevenueCat", Logo: RevenueCatLogo },
            { name: "Superwall", Logo: SuperwallLogo },
            { name: "PriceLocalize", Logo: PriceLocalizeLogo },
        ],
        color: "#22c55e",
        colorClass: "text-green-500",
        bgClass: "bg-green-500/10",
        borderClass: "border-green-500/20",
        Icon: CreditCard,
    },
    {
        number: 5,
        title: "Marketing & Growth",
        subtitle: "Scale to your first 1,000 users",
        description:
            "Organic traffic gets you started. Paid acquisition and viral loops scale you up. Learn both.",
        bullets: [
            "ASO with Astro keyword tracking",
            "Apple Search Ads for targeted installs",
            "TikTok geo-targeting for viral reach",
            "Double down on what works",
        ],
        tools: [
            { name: "Astro", Logo: AstroToolLogo },
            { name: "Apple", Logo: AppleLogo },
            { name: "TikTok", Logo: TikTokLogo },
        ],
        color: "#f4cf8f",
        colorClass: "text-[#f4cf8f]",
        bgClass: "bg-[#f4cf8f]/10",
        borderClass: "border-[#f4cf8f]/20",
        Icon: TrendingUp,
    },
];

const ToolPill = ({ name, Logo }: Tool) => (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">
        <Logo className="h-4 w-4" />
        <span className="text-xs font-medium text-[#c9c4bc]">{name}</span>
    </div>
);

const StepCard = ({ step, index }: { step: Step; index: number }) => {
    const { Icon } = step;

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
        >
            {/* Connector line */}
            <div className="absolute left-5 md:left-1/2 top-0 h-full w-px bg-white/10 md:-translate-x-px" />

            {/* Number circle */}
            <div className="relative flex md:justify-center mb-6">
                <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
                    className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-[#2a2725] text-sm font-bold"
                    style={{ backgroundColor: step.color, color: "#2a2725" }}
                >
                    {step.number}
                </motion.div>
            </div>

            {/* Card */}
            <div className="ml-14 md:ml-0 md:max-w-3xl md:mx-auto">
                <div className="rounded-3xl bg-white/5 border border-white/5 p-6 md:p-8 transition-colors hover:bg-white/10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-1">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${step.bgClass} ${step.colorClass} border ${step.borderClass}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#c9c4bc]">
                            <Sparkles className="h-3.5 w-3.5" />
                            100% AI
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="mt-4 text-xl font-serif font-bold text-[#f1ebe2] md:text-2xl">
                        {step.title}
                    </h3>
                    <p className={`mt-1 text-sm font-medium ${step.colorClass}`}>
                        {step.subtitle}
                    </p>

                    {/* Description */}
                    <p className="mt-4 text-[#c9c4bc] leading-relaxed">
                        {step.description}
                    </p>

                    {/* Bullets */}
                    <ul className="mt-5 space-y-2.5">
                        {step.bullets.map((bullet) => (
                            <li key={bullet} className="flex items-center gap-3 text-sm text-[#f1ebe2]/80">
                                <div
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: step.color }}
                                />
                                {bullet}
                            </li>
                        ))}
                    </ul>

                    {/* Divider + Tools */}
                    <div className="mt-6 border-t border-white/5 pt-5">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#c9c4bc]/60">
                            Tools
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {step.tools.map((tool) => (
                                <ToolPill key={tool.name} {...tool} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const MilestoneCard = ({
    title,
    subtitle,
    index,
}: {
    title: string;
    subtitle: string;
    index: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
    >
        {/* Connector line */}
        <div className="absolute left-5 md:left-1/2 top-0 h-full w-px bg-white/10 md:-translate-x-px" />

        {/* Milestone circle */}
        <div className="relative flex md:justify-center mb-6">
            <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#f4cf8f] ring-4 ring-[#2a2725]"
            >
                <DollarSign className="h-5 w-5 text-[#2a2725]" />
            </motion.div>
        </div>

        {/* Milestone card */}
        <div className="ml-14 md:ml-0 md:max-w-3xl md:mx-auto">
            <div className="rounded-3xl border-2 border-[#f4cf8f]/30 bg-[#f4cf8f]/5 p-6 md:p-8 text-center">
                <div className="mb-4 flex items-center justify-center gap-2">
                    <DollarSign className="h-6 w-6 text-[#f4cf8f]" />
                    <h3 className="text-2xl font-serif font-bold text-[#f4cf8f]">{title}</h3>
                </div>
                <p className="text-[#c9c4bc]">{subtitle}</p>

                {/* Screenshot placeholder */}
                <div className="mt-6 flex items-center justify-center rounded-2xl border border-[#f4cf8f]/20 bg-[#f4cf8f]/5 p-8">
                    <div className="text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f4cf8f]/10">
                            <DollarSign className="h-6 w-6 text-[#f4cf8f]" />
                        </div>
                        <p className="text-sm text-[#c9c4bc]">Revenue screenshot coming soon</p>
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
);

const Roadmap = () => {
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
                <div className="relative mb-32">
                    {/* Horizontal Line (Desktop) */}
                    <div className="hidden md:block absolute top-[5.5rem] left-0 w-full h-px bg-white/10" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-4">
                        {horizontalMilestones.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="relative flex flex-col items-center text-center"
                            >
                                {/* Icon */}
                                <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5 shadow-sm transition-transform hover:scale-110">
                                    <step.Icon className="h-10 w-10 text-[#f4cf8f]" />
                                </div>

                                {/* Dot on line */}
                                <div className="hidden md:block absolute top-[5.2rem] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#2a2725] border-4 border-[#2a2725] z-10">
                                    <div className="w-full h-full rounded-full bg-[#f4cf8f]" />
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-bold text-[#f1ebe2] mb-2 font-serif">{step.day}</h3>
                                <p className="text-[#c9c4bc] text-sm md:max-w-[220px] leading-relaxed">{step.title}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* 2. Detailed Vertical Timeline */}
                <div className="relative space-y-12 md:space-y-16">
                    {/* Steps 1-4 */}
                    {steps.slice(0, 4).map((step, i) => (
                        <StepCard key={step.number} step={step} index={i} />
                    ))}

                    {/* Milestone: First Dollar */}
                    <MilestoneCard
                        title="Your first dollar"
                        subtitle="Made within hours of launch"
                        index={4}
                    />

                    {/* Step 5 */}
                    <StepCard key={steps[4].number} step={steps[4]} index={5} />

                    {/* Milestone: Scaled Revenue */}
                    <MilestoneCard
                        title="Then scale it"
                        subtitle="This is what marketing does"
                        index={6}
                    />

                    {/* Bottom cap for the timeline line */}
                    <div className="relative flex md:justify-center">
                        <div className="absolute left-5 md:left-1/2 top-0 h-4 w-px bg-gradient-to-b from-white/10 to-transparent md:-translate-x-px" />
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Roadmap;
