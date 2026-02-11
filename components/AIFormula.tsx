"use client";

import { motion } from "framer-motion";
import { Lightbulb, Plus, Sparkles, Equal, Rocket } from "lucide-react";

const AIFormula = () => {
    return (
        <div className="py-16 relative overflow-hidden">
            {/* Background enhancement - Removed for embedding */}

            <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="mb-16 text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">
                        The new way to build
                    </h2>
                    <p className="mt-4 text-lg text-[#c9c4bc]">
                        AI writes <span className="text-[#f4cf8f] font-bold">95%</span> of the code. You just provide the vision.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
                    {/* Element 1: You */}
                    <motion.div
                        initial={{ opacity: 1, y: 0 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="h-24 w-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                            <Lightbulb className="h-10 w-10 text-[#c9c4bc]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2]">Your Idea</h3>
                            <p className="text-sm text-[#c9c4bc]">5% Vision</p>
                        </div>
                    </motion.div>

                    {/* Operator: Plus */}
                    <motion.div
                        initial={{ opacity: 1, scale: 1 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <Plus className="h-8 w-8 text-[#f4cf8f]" />
                    </motion.div>

                    {/* Element 2: AI */}
                    <motion.div
                        initial={{ opacity: 1, y: 0 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="h-24 w-24 rounded-3xl bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 flex items-center justify-center shadow-[0_0_30px_rgba(244,207,143,0.1)]">
                            <Sparkles className="h-10 w-10 text-[#f4cf8f]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f4cf8f]">AI Tools</h3>
                            <p className="text-sm text-[#c9c4bc]">95% Execution</p>
                        </div>
                    </motion.div>

                    {/* Operator: Equal */}
                    <motion.div
                        initial={{ opacity: 1, scale: 1 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                    >
                        <Equal className="h-8 w-8 text-[#f4cf8f]" />
                    </motion.div>

                    {/* Element 3: Result */}
                    <motion.div
                        initial={{ opacity: 1, y: 0 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#f4cf8f] to-[#dcb06e] flex items-center justify-center shadow-lg shadow-[#f4cf8f]/20">
                            <Rocket className="h-10 w-10 text-[#2a2725]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2]">Shipped App</h3>
                            <p className="text-sm text-[#c9c4bc]">100% Yours</p>
                        </div>
                    </motion.div>
                </div>

                {/* Contextual Note */}
                <motion.div
                    initial={{ opacity: 1 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 }}
                    className="mt-16 text-center"
                >
                    <div className="inline-block rounded-full bg-white/5 px-6 py-2 text-sm text-[#c9c4bc] border border-white/5">
                        <span className="text-[#f4cf8f]">Note:</span> You don't need to be a senior engineer. AI handles the heavy lifting.
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AIFormula;
