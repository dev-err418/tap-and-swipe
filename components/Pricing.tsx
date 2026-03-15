"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Star } from "lucide-react";
import BundleMiniCard from "./BundleMiniCard";
const features = [
    "Complete 6-week roadmap",
    "30+ video lessons",
    "Ready-to-start boilerplate (skip the setup, start building)",
    "2x weekly group calls",
    "Revenue scaling systems",
    "Private builder community (51+ makers)",
];

const Pricing = () => {
    return (
        <section id="pricing" data-fast-scroll="scroll_to_pricing" className="bg-[#2a2725] py-24">

            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">
                        Code your idea fast, build your freedom
                    </h2>
                    <p className="mt-4 text-lg text-[#c9c4bc] max-w-2xl mx-auto">
                        Everything you need to stop dreaming and start shipping. Join the community of builders turned into founders.
                    </p>
                </div>

                <div className="max-w-lg mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10 flex flex-col"
                    >
                        <p className="text-lg font-bold text-[#f1ebe2] mb-4">
                            App Sprint Community
                        </p>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-extrabold text-[#f1ebe2]">137&euro;</span>
                                <span className="text-lg text-[#c9c4bc]">/mo</span>
                            </div>
                        </div>

                        <ul className="space-y-2.5">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#f4cf8f]" />
                                    <span className="text-sm font-medium text-[#f1ebe2]">{feature}</span>
                                </li>
                            ))}
                            <li className="flex items-start gap-3">
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#f4cf8f]" />
                                <span className="text-sm font-bold text-[#f4cf8f]">App Sprint ASO Pro included (worth 19€/mo)</span>
                            </li>
                        </ul>

                        {/* ASO included */}
                        <div className="mt-6">
                            <BundleMiniCard
                                name="App Sprint ASO"
                                tagline="The all-in-one macOS app for ASO"
                                icon="/aso/app-icon.png"
                                value=""
                                features={[
                                    "Keyword research & tracking",
                                    "Competitor MRR estimates",
                                    "Apple Search Ads management",
                                    "Unlimited keywords & apps",
                                ]}
                            />
                        </div>

                        <div className="flex -space-x-2 mt-6 justify-center">
                            {["/jx_op.png", "/luka.png", "/jesse.png", "/hnythng.png", "/raphael.png"].map((src, i) => (
                                <img
                                    key={i}
                                    className="h-9 w-9 rounded-full border-2 border-[#2a2725] object-cover"
                                    src={src}
                                    alt="Member"
                                />
                            ))}
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#2a2725] bg-white/10 text-xs font-bold text-[#c9c4bc]">
                                51+
                            </span>
                        </div>

                        <div className="text-center mt-8">
                            <a
                                href="/api/auth/discord"
                                data-fast-goal="cta_pricing_clicked"
                                className="group flex w-full h-12 items-center justify-center gap-2 rounded-full bg-[#f4cf8f] text-sm font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer mb-4"
                            >
                                <span>Launch your app, now</span>
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </a>
                            <div className="flex items-center justify-center gap-2 text-xs text-[#c9c4bc]">
                                <div className="flex text-[#f4cf8f]">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="h-3 w-3 fill-current" />
                                    ))}
                                </div>
                                Rated 5/5 by makers
                            </div>
                        </div>
                    </motion.div>

                    {/* Money-back / Guarantee note */}
                    <p className="mt-8 text-center text-sm text-[#c9c4bc]/50 leading-relaxed max-w-xl mx-auto italic">
                        By joining, you agree to our Terms of Service. Cancel anytime from your account settings.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
