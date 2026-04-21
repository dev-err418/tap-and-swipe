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
    "Private builder community (63+ makers)",
];

const Pricing = () => {
    return (
        <section id="pricing" data-fast-scroll="scroll_to_pricing" className="bg-white py-24">

            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
                        Code your idea fast, build your freedom
                    </h2>
                    <p className="mt-4 text-lg text-black/50 max-w-2xl mx-auto">
                        Everything you need to stop dreaming and start shipping. Join the community of builders turned into founders.
                    </p>
                </div>

                <div className="max-w-lg mx-auto px-6">
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
                                <span className="text-5xl font-extrabold text-black">127&euro;</span>
                                <span className="text-lg text-black/50">/mo</span>
                            </div>
                        </div>

                        <ul className="space-y-2.5">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                                    <span className="text-sm font-medium text-black">{feature}</span>
                                </li>
                            ))}
                            <li className="flex items-start gap-3">
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                                <span className="text-sm font-bold text-black">AppSprint ASO Pro included (worth 39€/mo)</span>
                            </li>
                        </ul>

                        {/* ASO included */}
                        <div className="mt-6">
                            <BundleMiniCard
                                name="AppSprint ASO"
                                tagline="The all-in-one macOS app for ASO"
                                href="https://appsprint.app/aso"
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
                                href="/api/checkout"
                                data-fast-goal="cta_pricing_clicked"
                                className="group flex w-full h-12 items-center justify-center gap-2 rounded-full bg-[#FF9500] text-sm font-bold text-white transition-all hover:bg-[#FF9500]/85 hover:ring-4 hover:ring-[#FF9500]/20 cursor-pointer mb-4"
                            >
                                <span>Launch your app, now</span>
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </a>
                            <div className="flex items-center justify-center gap-2 text-xs text-black/50">
                                <div className="flex text-[#FF9500]">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="h-3 w-3 fill-current" />
                                    ))}
                                </div>
                                Rated 5/5 by makers
                            </div>
                        </div>
                    </motion.div>

                    {/* Money-back / Guarantee note */}
                    <p className="mt-8 text-center text-sm text-black/30 leading-relaxed max-w-xl mx-auto italic">
                        By joining, you agree to our Terms of Service. Cancel anytime from your account settings.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
