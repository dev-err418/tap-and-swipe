"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, PartyPopper, ArrowRight, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SuccessOverlay = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (searchParams.get("status") === "success") {
            setIsVisible(true);
        }
    }, [searchParams]);

    const handleClose = () => {
        setIsVisible(false);
        // Clear the query parameter to avoid showing the modal again on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete("status");
        router.push(url.pathname, { scroll: false });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-[#2a2725]/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-[40px] border border-white/10 bg-[#2a2725] p-8 shadow-2xl shadow-[#f4cf8f]/10 sm:p-12"
                    >
                        {/* Decorative Background Accents */}
                        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-[#f4cf8f]/10 blur-3xl" />
                        <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-[#f4cf8f]/5 blur-3xl" />

                        <div className="relative text-center">
                            {/* Animated Success Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.2, stiffness: 200, damping: 10 }}
                                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#f4cf8f]/10 ring-1 ring-[#f4cf8f]/20"
                            >
                                <CheckCircle2 className="h-12 w-12 text-[#f4cf8f]" />
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mb-4 font-serif text-4xl font-bold text-[#f1ebe2] sm:text-5xl"
                            >
                                You&apos;re in! 🎉
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mb-10 text-lg text-[#c9c4bc] leading-relaxed"
                            >
                                Welcome to the App Sprint. You’ve taken the first step toward launching your own mobile app business.
                            </motion.p>

                            {/* Action Steps */}
                            <div className="mb-10 space-y-4 text-left">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4cf8f]/20">
                                        <MessageSquare className="h-5 w-5 text-[#f4cf8f]" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#f1ebe2]">Join the Community</h4>
                                        <p className="text-sm text-[#c9c4bc]">Jump into the Discord to meet 41+ other makers.</p>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4cf8f]/20">
                                        <PartyPopper className="h-5 w-5 text-[#f4cf8f]" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#f1ebe2]">Check your Email</h4>
                                        <p className="text-sm text-[#c9c4bc]">We just sent you the induction guide and access links.</p>
                                    </div>
                                </motion.div>
                            </div>

                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                onClick={handleClose}
                                className="group flex w-full h-14 items-center justify-center gap-2 rounded-full bg-[#f4cf8f] text-lg font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-8 hover:ring-[#f4cf8f]/10 cursor-pointer"
                            >
                                Take me to the roadmap
                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Celebration Particles (Simple CSS) */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    top: "-10%",
                                    left: `${Math.random() * 100}%`,
                                    opacity: 1,
                                    scale: Math.random() * 0.5 + 0.5,
                                    rotate: 0,
                                }}
                                animate={{
                                    top: "110%",
                                    left: `${(Math.random() - 0.5) * 20 + 50}%`,
                                    opacity: 0,
                                    rotate: 360,
                                }}
                                transition={{
                                    duration: Math.random() * 2 + 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 5,
                                    ease: "linear",
                                }}
                                className="absolute text-2xl"
                            >
                                {["🎉", "✨", "🚀", "💰"][i % 4]}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SuccessOverlay;
