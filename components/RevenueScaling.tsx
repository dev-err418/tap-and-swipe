"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, DollarSign } from "lucide-react";

const RevenueScaling = () => {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="mx-auto max-w-7xl px-6">

                {/* Section Header */}
                <div className="mb-16 text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">
                        The ultimate goal
                    </h2>
                    <p className="mt-4 text-lg text-[#c9c4bc]">
                        From your <span className="text-[#f4cf8f] font-bold">first internet dollar</span> to a scalable recurring revenue business.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center max-w-5xl mx-auto">

                    {/* Step 1: First Dollar */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative group"
                    >
                        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#f4cf8f]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
                        <div className="relative rounded-3xl bg-[#2a2725] border border-white/10 p-8 h-full min-h-[320px] flex flex-col">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-8 w-8 rounded-full bg-[#f4cf8f]/10 flex items-center justify-center text-[#f4cf8f] font-bold text-sm">1</div>
                                <h3 className="text-xl font-bold text-[#f1ebe2]">The First Dollar</h3>
                            </div>

                            {/* Visual: Payment Notification */}
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-full bg-[#1e1c1b] rounded-2xl p-6 border border-white/5 shadow-inner">
                                    <div className="flex items-center gap-4 bg-[#2a2725] p-4 rounded-xl border border-white/5 shadow-lg transform rotate-[-2deg] transition-transform group-hover:rotate-0">
                                        <div className="h-10 w-10 rounded-full bg-[#34c759]/20 flex items-center justify-center flex-shrink-0">
                                            <DollarSign className="h-5 w-5 text-[#34c759]" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[#c9c4bc] uppercase tracking-wider font-medium">Payment Received</p>
                                            <p className="text-lg font-bold text-[#f1ebe2]">$9.00</p>
                                        </div>
                                        <div className="ml-auto text-[10px] text-[#c9c4bc]">Just now</div>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-2 opacity-30">
                                        <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                                        <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Arrow (Desktop) */}
                    <div className="hidden md:flex justify-center text-[#f4cf8f]/20">
                        <ArrowRight className="h-8 w-8" />
                    </div>

                    {/* Mobile Arrow */}
                    <div className="md:hidden flex justify-center py-2 text-[#f4cf8f]/20">
                        <ArrowRight className="h-8 w-8 rotate-90" />
                    </div>

                    {/* Step 2: Recurring Revenue */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-l from-[#f4cf8f]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
                        <div className="relative rounded-3xl bg-[#2a2725] border border-white/10 p-8 h-full min-h-[320px] flex flex-col">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-8 w-8 rounded-full bg-[#f4cf8f]/10 flex items-center justify-center text-[#f4cf8f] font-bold text-sm">2</div>
                                <h3 className="text-xl font-bold text-[#f1ebe2]">Recurring Revenue</h3>
                            </div>

                            {/* Visual: MRR Chart */}
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-full bg-[#1e1c1b] rounded-2xl p-6 border border-white/5 shadow-inner relative overflow-hidden">
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <p className="text-[10px] text-[#c9c4bc] uppercase tracking-wider font-medium">Monthly Revenue</p>
                                            <p className="text-2xl font-bold text-[#f1ebe2]">$5,842</p>
                                        </div>
                                        <div className="flex items-center text-[#34c759] text-xs font-bold bg-[#34c759]/10 px-2 py-1 rounded">
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                            +42%
                                        </div>
                                    </div>

                                    {/* CSS Chart Bars */}
                                    <div className="h-24 w-full flex items-end gap-1.5">
                                        {[30, 45, 35, 50, 65, 55, 75, 80, 70, 90, 85, 100].map((h, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 bg-[#f4cf8f] rounded-t-sm transition-all duration-500 hover:brightness-110"
                                                style={{ height: `${h}%`, opacity: 0.2 + (i * 0.06) }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

            </div>
        </section>
    );
};

export default RevenueScaling;
