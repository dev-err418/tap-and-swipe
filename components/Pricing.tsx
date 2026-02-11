"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Star, ShieldCheck } from "lucide-react";

const features = [
    { title: "Complete 6-week roadmap", description: "From blank screen to 1,000 users" },
    { title: "2x Weekly group calls", description: "Direct access to strategy and masterminds" },
    { title: "Revenue scaling systems", description: "Proven monetization and ASO templates" },
    { title: "Private builder community", description: "Collaborate with 41+ other makers" },
];

const Pricing = () => {
    return (
        <section id="pricing" className="bg-[#2a2725] py-24 border-t border-white/5 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-[#f4cf8f]/5 blur-[120px] pointer-events-none" />

            <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl mb-4">
                        Code your idea fast, build your freedom
                    </h2>
                    <p className="mt-4 text-lg text-[#c9c4bc] max-w-2xl mx-auto">
                        Everything you need to stop dreaming and start shipping. Join the community of builders turned into founders.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative rounded-[40px] border border-white/10 bg-white/5 p-8 md:p-12 shadow-2xl backdrop-blur-sm"
                    >


                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            {/* Left: Features */}
                            <div>
                                <h3 className="text-2xl font-bold text-[#f1ebe2] mb-8">What founders get:</h3>
                                <ul className="space-y-6">
                                    {features.map((feature, i) => (
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

                            {/* Right: Pricing & CTA */}
                            <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white/5 border border-white/5 text-center">
                                <span className="text-sm font-medium text-[#c9c4bc] mb-2 uppercase tracking-widest">App Sprint Membership</span>
                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-5xl font-extrabold text-[#f1ebe2]">147€</span>
                                    <span className="text-xl text-[#c9c4bc]">/mo</span>
                                </div>
                                <span className="text-xs text-[#c9c4bc]/60 mb-8 font-medium italic">[tax excluded]</span>

                                <a
                                    href="/api/checkout"
                                    className="group flex w-full h-14 items-center justify-center gap-2 rounded-full bg-[#f4cf8f] text-lg font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-8 hover:ring-[#f4cf8f]/10 cursor-pointer shadow-lg shadow-[#f4cf8f]/10 mb-6"
                                >
                                    Start Building Now
                                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </a>

                                <div className="flex flex-col gap-3 w-full">
                                    <div className="flex items-center justify-center gap-2 text-xs text-[#c9c4bc]">
                                        <ShieldCheck className="h-4 w-4 text-[#f4cf8f]" />
                                        Secure payment with Stripe
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs text-[#c9c4bc]">
                                        <div className="flex text-[#f4cf8f]">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className="h-3 w-3 fill-current" />
                                            ))}
                                        </div>
                                        Rated 5/5 by makers
                                    </div>
                                </div>
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
