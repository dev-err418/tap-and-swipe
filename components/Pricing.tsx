"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Star } from "lucide-react";

const premiumFeatures = [
    "2x weekly group calls",
    "Ready-to-start Expo boilerplate (skip the setup, start building)",
    "Guest masterclasses with founders >10K€ MRR (coming 2026)",
];

const Pricing = () => {
    return (
        <section id="pricing" data-fast-scroll="scroll_to_pricing" className="bg-white py-24">

            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
                        Code your idea fast, build your freedom
                    </h2>
                    <p className="mt-4 text-lg text-black/50 max-w-2xl mx-auto">
                        Everything you need to{" "}
                        <span className="underline decoration-[#FF9500] decoration-wavy decoration-[2px] underline-offset-[5px]">
                            stop dreaming and start shipping
                        </span>
                        . Join the community of builders turned into founders.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-3xl border border-black/10 bg-black/[0.02] p-8 md:p-10 flex flex-col"
                    >
                        <p className="text-lg font-bold text-black mb-4">
                            Starter Community
                        </p>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-extrabold text-black">$99</span>
                                <span className="text-lg text-black/50">/mo</span>
                            </div>
                        </div>

                        <ul className="space-y-2.5">
                            <li className="flex items-start gap-3">
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                                <span className="text-sm font-medium text-black">Private builder community (63+ makers)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                                <span className="text-sm font-medium text-black">30+ video lessons</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                                <span className="group relative inline-block">
                                    <a
                                        href="https://appsprint.app/aso"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-bold text-black"
                                    >
                                        <span className="underline decoration-black decoration-wavy decoration-[1.5px]">AppSprint ASO Solo</span> included (worth 19€/mo)
                                    </a>
                                    <div
                                        role="tooltip"
                                        className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 w-72 -translate-x-1/2 rounded-2xl border border-black/10 bg-white p-5 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-10 w-10 shrink-0 rounded-[10px] bg-black/85 border border-black/15">
                                                <img
                                                    src="/aso/app-icon.png"
                                                    alt="AppSprint ASO"
                                                    width={40}
                                                    height={40}
                                                    className="h-full w-full rounded-[10px] p-1"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-black">AppSprint ASO Solo</p>
                                                <p className="text-xs text-black/50">Core ASO features for your apps</p>
                                            </div>
                                        </div>
                                        <ul className="space-y-2">
                                            {[
                                                "1 app",
                                                "Keyword research & tracking",
                                                "Competitor MRR estimates",
                                                "Price localization",
                                            ].map((f) => (
                                                <li key={f} className="flex items-start gap-2">
                                                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-black" />
                                                    <span className="text-xs text-black/70">{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </span>
                            </li>
                        </ul>

                        <div className="text-center mt-auto pt-8">
                            <a
                                href="/api/auth/discord?flow=community-starter"
                                data-fast-goal="cta_pricing_starter_clicked"
                                className="group flex w-full h-12 items-center justify-center gap-2 rounded-full border border-black/15 bg-white text-sm font-bold text-black transition-all hover:bg-black/5 cursor-pointer"
                            >
                                <span>Join the community</span>
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </a>
                            {process.env.NODE_ENV === "development" && (
                                <a
                                    href="/api/checkout?tier=starter"
                                    className="mt-2 inline-block w-full rounded-full border border-dashed border-black/20 px-4 py-2 text-xs font-mono text-black/50 hover:bg-black/5"
                                >
                                    [dev] open paywall directly
                                </a>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-3xl border border-black/10 bg-black/[0.02] p-8 md:p-10 flex flex-col"
                    >
                        <p className="text-lg font-bold text-black mb-4">
                            AppSprint Community
                        </p>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-extrabold text-black">$149</span>
                                <span className="text-lg text-black/50">/mo</span>
                            </div>
                        </div>

                        <ul className="space-y-2.5">
                            <li className="flex items-start gap-3">
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                                <span className="text-sm font-medium text-black">Everything in Starter Community</span>
                            </li>
                            {premiumFeatures.map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                                    <span className="text-sm font-medium text-black">{feature}</span>
                                </li>
                            ))}
                            <li className="flex items-start gap-3">
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                                <span className="group relative inline-block">
                                    <a
                                        href="https://appsprint.app/aso"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-bold text-black"
                                    >
                                        <span className="underline decoration-[#FF9500] decoration-wavy decoration-[1.5px]">AppSprint ASO Pro</span> included (worth 39€/mo)
                                    </a>
                                    <div
                                        role="tooltip"
                                        className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 w-72 -translate-x-1/2 rounded-2xl border border-black/10 bg-white p-5 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-10 w-10 shrink-0 rounded-[10px] bg-black/85 border border-black/15">
                                                <img
                                                    src="/aso/app-icon.png"
                                                    alt="AppSprint ASO"
                                                    width={40}
                                                    height={40}
                                                    className="h-full w-full rounded-[10px] p-1"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-black">AppSprint ASO Pro</p>
                                                <p className="text-xs text-black/50">The all-in-one macOS app for ASO</p>
                                            </div>
                                        </div>
                                        <ul className="space-y-2">
                                            {[
                                                "Unlimited apps",
                                                "Keyword research & tracking",
                                                "Deep competitor analysis",
                                                "Price localization",
                                            ].map((f) => (
                                                <li key={f} className="flex items-start gap-2">
                                                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-black" />
                                                    <span className="text-xs text-black/70">{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </span>
                            </li>
                        </ul>

                        <div className="flex -space-x-2 mt-6 justify-center">
                            {[
                                { src: "/jx_op.webp", name: "JX_Op" },
                                { src: "/luka.webp", name: "Luka" },
                                { src: "/jesse.webp", name: "Jesse" },
                                { src: "/hnythng.webp", name: "Hnythng" },
                                { src: "/raphael.webp", name: "Raphael" },
                            ].map((member, i) => (
                                <img
                                    key={i}
                                    className="h-9 w-9 rounded-full border-2 border-white object-cover"
                                    src={member.src}
                                    alt={member.name}
                                    width={36}
                                    height={36}
                                    loading="lazy"
                                />
                            ))}
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-black/10 text-xs font-bold text-black/50">
                                63+
                            </span>
                        </div>

                        <div className="text-center mt-8">
                            <a
                                href="/api/auth/discord?flow=community"
                                data-fast-goal="cta_pricing_clicked"
                                className="group flex w-full h-12 items-center justify-center gap-2 rounded-full bg-[#FF9500] text-sm font-bold text-white transition-all hover:bg-[#FF9500]/85 hover:ring-4 hover:ring-[#FF9500]/20 cursor-pointer"
                            >
                                <span>Launch your app, now</span>
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </a>
                            {process.env.NODE_ENV === "development" && (
                                <a
                                    href="/api/checkout?tier=full"
                                    className="mt-2 inline-block w-full rounded-full border border-dashed border-black/20 px-4 py-2 text-xs font-mono text-black/50 hover:bg-black/5"
                                >
                                    [dev] open paywall directly
                                </a>
                            )}
                        </div>
                    </motion.div>

                    {/* Rating */}
                    <div className="md:col-span-2 mt-6 flex items-center justify-center gap-2 text-xs text-black/50">
                        <div className="flex text-[#FF9500]">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-current" />
                            ))}
                        </div>
                        Rated 5/5 by makers
                    </div>

                    {/* Money-back / Guarantee note */}
                    <p className="md:col-span-2 mt-0 text-center text-sm text-black/30 leading-relaxed max-w-xl mx-auto italic">
                        By joining, you agree to our Terms of Service. Cancel anytime from your account settings.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
