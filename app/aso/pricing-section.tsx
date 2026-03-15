"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import SubscribeButton from "./subscribe-button";
import RollingPrice from "./rolling-price";

export default function PricingSection({ lastUpdate }: { lastUpdate?: ReactNode }) {
    const [interval, setInterval] = useState<"month" | "year">("month");

    return (
        <section id="pricing" className="bg-[#2a2725] py-24">
            <div className="mx-auto max-w-4xl px-6">
                {/* Monthly / Yearly toggle */}
                <div className="flex items-center justify-center mb-12">
                    <div className="relative inline-flex rounded-full bg-white/5 p-1">
                        <motion.div
                            className="absolute top-1 bottom-1 rounded-full bg-[#f4cf8f]"
                            style={{ width: "calc(50% - 4px)" }}
                            initial={false}
                            animate={{ left: interval === "month" ? "4px" : "50%" }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        />
                        <button
                            onClick={() => setInterval("month")}
                            className={`relative z-10 rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-200 ${
                                interval === "month"
                                    ? "text-[#2a2725]"
                                    : "text-[#c9c4bc] hover:text-[#f1ebe2]"
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setInterval("year")}
                            className={`relative z-10 rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-200 ${
                                interval === "year"
                                    ? "text-[#2a2725]"
                                    : "text-[#c9c4bc] hover:text-[#f1ebe2]"
                            }`}
                        >
                            Yearly
                            <motion.span
                                className="absolute -top-3 -right-14 text-[10px] font-bold uppercase tracking-wider text-[#f4cf8f] bg-[#f4cf8f]/15 px-2 py-0.5 rounded-full whitespace-nowrap"
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                Save 2 months
                            </motion.span>
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 items-stretch">
                    {/* Solo */}
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col max-w-lg mx-auto w-full md:max-w-none">
                        <p className="text-lg font-bold text-[#c9c4bc] mb-4">Solo</p>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-5xl font-extrabold text-[#f1ebe2]">
                                    &euro;<RollingPrice value={interval === "month" ? "9" : "90"} />
                                </span>
                                <span className="text-lg text-[#c9c4bc]">
                                    /{interval === "month" ? "mo" : "yr"}
                                </span>
                            </div>
                        </div>

                        <ul className="flex flex-col gap-2.5 flex-1">
                            <li
                                className={`flex items-start gap-3 transition-all duration-300 ${
                                    interval === "year" ? "opacity-100 h-auto" : "opacity-0 h-0 overflow-hidden -mb-2.5"
                                }`}
                            >
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#f4cf8f]" />
                                <span className="text-sm font-bold text-[#f4cf8f]">Save 18&euro;</span>
                            </li>
                            {[
                                "1 app",
                                "Keyword research, suggestions & tracking",
                                "Competitor MRR & download estimates",
                                "Cannibalization detection",
                                "App Store Connect metadata editing",
                                "Apple Search Ads management",
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#f4cf8f]" />
                                    <span className="text-sm font-medium text-[#f1ebe2]">{feature}</span>
                                </li>
                            ))}
                            <li className="flex items-start gap-3">
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#f4cf8f]" />
                                <span className="text-sm font-medium text-[#f1ebe2]">
                                    All updates
                                    {lastUpdate}
                                </span>
                            </li>
                        </ul>

                        <div className="text-center mt-8">
                            <SubscribeButton plan="solo" interval={interval} />
                            <p className="text-xs font-semibold text-[#f1ebe2] mb-1">&euro;0.00 due today.</p>
                            <p className="text-xs text-[#c9c4bc]/60">
                                Single computer license &middot; macOS 14.6+
                            </p>
                        </div>
                    </div>

                    {/* Pro */}
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col max-w-lg mx-auto w-full md:max-w-none">
                        <p className="text-lg font-bold text-[#c9c4bc] mb-4">Pro</p>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-5xl font-extrabold text-[#f1ebe2]">
                                    &euro;<RollingPrice value={interval === "month" ? "19" : "190"} />
                                </span>
                                <span className="text-lg text-[#c9c4bc]">
                                    /{interval === "month" ? "mo" : "yr"}
                                </span>
                            </div>
                            <p className="text-sm text-[#c9c4bc]/50">
                                or free with{" "}
                                <a href="/app-sprint-community" className="text-[#f4cf8f] hover:underline">
                                    Community membership
                                </a>
                            </p>
                        </div>

                        <ul className="flex flex-col gap-2.5 flex-1">
                            <li
                                className={`flex items-start gap-3 transition-all duration-300 ${
                                    interval === "year" ? "opacity-100 h-auto" : "opacity-0 h-0 overflow-hidden -mb-2.5"
                                }`}
                            >
                                <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#f4cf8f]" />
                                <span className="text-sm font-bold text-[#f4cf8f]">Save 38&euro;</span>
                            </li>
                            {[
                                "Everything in Solo",
                                "Unlimited apps",
                                "Priority updates",
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#f4cf8f]" />
                                    <span className="text-sm font-medium text-[#f1ebe2]">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="text-center mt-8">
                            <SubscribeButton plan="pro" interval={interval} />
                            <p className="text-xs font-semibold text-[#f1ebe2] mb-1">&euro;0.00 due today.</p>
                            <p className="text-xs text-[#c9c4bc]/60">
                                Single computer license &middot; macOS 14.6+
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
