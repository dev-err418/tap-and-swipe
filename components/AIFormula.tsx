"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Equal, Rocket } from "lucide-react";
import { useEffect, useState } from "react";

const aiTools = [
    { name: "Claude Code", logo: "/icons/claude.png" },
    { name: "Codex", logo: "/icons/openai.png" },
    { name: "Cursor", logo: "/icons/cursor.png" },
    { name: "Antigravity", logo: "/icons/antigravity.png" },
];

const AIFormula = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % aiTools.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="py-16 relative overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="mb-16 text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">
                        The new way to build
                    </h2>
                    <p className="mt-4 text-lg text-[#c9c4bc]">
                        AI writes <span className="text-[#f4cf8f] font-bold">95%</span> of the code. You just provide the vision.
                    </p>
                </div>

                {/* Desktop: Grid layout — each element in its own column */}
                <div className="hidden md:grid grid-cols-5 items-start justify-items-center max-w-3xl mx-auto">
                    {/* Column 1: Idea */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                            <span className="text-4xl">💡</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2] whitespace-nowrap">Your Idea</h3>
                            <p className="text-sm text-[#c9c4bc]">5% Vision</p>
                        </div>
                    </div>

                    {/* Column 2: Plus */}
                    <div className="flex items-center justify-center h-24">
                        <Plus className="h-8 w-8 text-[#f4cf8f]" />
                    </div>

                    {/* Column 3: AI Tool */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 flex items-center justify-center shadow-[0_0_30px_rgba(244,207,143,0.1)] relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={activeIndex}
                                    src={aiTools[activeIndex].logo}
                                    alt={aiTools[activeIndex].name}
                                    className="h-10 w-10 rounded-lg object-contain"
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                />
                            </AnimatePresence>
                        </div>
                        <div className="text-center">
                            <AnimatePresence mode="wait">
                                <motion.h3
                                    key={activeIndex}
                                    className="text-xl font-bold text-[#f4cf8f] whitespace-nowrap"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {aiTools[activeIndex].name}
                                </motion.h3>
                            </AnimatePresence>
                            <p className="text-sm text-[#c9c4bc]">95% Execution</p>
                        </div>
                    </div>

                    {/* Column 4: Equal */}
                    <div className="flex items-center justify-center h-24">
                        <Equal className="h-8 w-8 text-[#f4cf8f]" />
                    </div>

                    {/* Column 5: Result */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#f4cf8f] to-[#dcb06e] flex items-center justify-center shadow-lg shadow-[#f4cf8f]/20">
                            <span className="text-4xl">🧑‍💻</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2] whitespace-nowrap">Shipped App</h3>
                            <p className="text-sm text-[#c9c4bc]">100% Yours</p>
                        </div>
                    </div>
                </div>

                {/* Mobile: Vertical layout */}
                <div className="flex md:hidden flex-col items-center gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                            <span className="text-4xl">💡</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2]">Your Idea</h3>
                            <p className="text-sm text-[#c9c4bc]">5% Vision</p>
                        </div>
                    </div>

                    <Plus className="h-8 w-8 text-[#f4cf8f]" />

                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 flex items-center justify-center shadow-[0_0_30px_rgba(244,207,143,0.1)] relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={activeIndex}
                                    src={aiTools[activeIndex].logo}
                                    alt={aiTools[activeIndex].name}
                                    className="h-10 w-10 rounded-lg object-contain"
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                />
                            </AnimatePresence>
                        </div>
                        <div className="text-center">
                            <AnimatePresence mode="wait">
                                <motion.h3
                                    key={activeIndex}
                                    className="text-xl font-bold text-[#f4cf8f] whitespace-nowrap"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {aiTools[activeIndex].name}
                                </motion.h3>
                            </AnimatePresence>
                            <p className="text-sm text-[#c9c4bc]">95% Execution</p>
                        </div>
                    </div>

                    <Equal className="h-8 w-8 text-[#f4cf8f]" />

                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#f4cf8f] to-[#dcb06e] flex items-center justify-center shadow-lg shadow-[#f4cf8f]/20">
                            <span className="text-4xl">📲</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2]">Shipped App</h3>
                            <p className="text-sm text-[#c9c4bc]">100% Yours</p>
                        </div>
                    </div>
                </div>

                {/* Contextual Note */}
                <div className="mt-16 text-center">
                    <div className="inline-block rounded-full bg-white/5 px-6 py-2 text-sm text-[#c9c4bc] border border-white/5">
                        <span className="text-[#f4cf8f]">Note:</span> You don&apos;t need to be a senior engineer. AI handles the heavy lifting.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIFormula;
