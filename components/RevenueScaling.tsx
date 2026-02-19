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

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center max-w-6xl mx-auto">

                    {/* Step 1: First Dollar */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative group h-full"
                    >
                        <div className="relative h-full min-h-[320px] flex flex-col">
                            <div className="flex items-center gap-3 mb-8 px-4">
                                <div className="h-8 w-8 rounded-full bg-[#f4cf8f]/10 flex items-center justify-center text-[#f4cf8f] font-bold text-sm">1</div>
                                <h3 className="text-xl font-bold text-[#f1ebe2]">The First Dollar</h3>
                            </div>

                            {/* Visual: Payment Notification */}
                            <div className="flex-1 flex items-center justify-center relative">
                                <img
                                    src="/first-sale.png"
                                    alt="First sale notification"
                                    className="relative z-10 rounded-xl border border-white/10 shadow-2xl transform rotate-[-2deg] transition-transform duration-500 group-hover:rotate-0 w-full md:w-full"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Arrow (Desktop) */}
                    <div className="hidden md:flex justify-center text-[#f4cf8f]">
                        <ArrowRight className="h-8 w-8" />
                    </div>

                    {/* Mobile Arrow */}
                    <div className="md:hidden flex justify-center py-2 text-[#f4cf8f]">
                        <ArrowRight className="h-8 w-8 rotate-90" />
                    </div>

                    {/* Step 2: Recurring Revenue */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="relative group h-full"
                    >
                        <div className="relative h-full min-h-[320px] flex flex-col">
                            <div className="flex items-center gap-3 mb-8 px-4">
                                <div className="h-8 w-8 rounded-full bg-[#f4cf8f]/10 flex items-center justify-center text-[#f4cf8f] font-bold text-sm">2</div>
                                <h3 className="text-xl font-bold text-[#f1ebe2]">Recurring Revenue</h3>
                            </div>

                            {/* Visual: MRR Chart */}
                            <div className="flex-1 flex items-center justify-center relative">
                                <img
                                    src="/recurring-revenue.jpg"
                                    alt="Recurring revenue chart"
                                    className="relative z-10 rounded-xl border border-white/10 shadow-2xl transform rotate-[2deg] transition-transform duration-500 group-hover:rotate-0 w-full md:w-full"
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>

            </div>
        </section>
    );
};

export default RevenueScaling;
