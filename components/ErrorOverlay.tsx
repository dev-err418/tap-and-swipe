"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X, ArrowRight, RefreshCw, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ErrorOverlay = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [errorData, setErrorData] = useState<{
        title: string;
        message: string;
        icon: React.ReactNode;
        type: "cancel" | "error";
    } | null>(null);

    useEffect(() => {
        const status = searchParams.get("status");
        const error = searchParams.get("error");

        if (status === "canceled") {
            setErrorData({
                title: "Checkout Canceled",
                message: "No worries! Your spot is still reserved. Whenever you're ready to join, we'll be here.",
                icon: <X className="h-12 w-12 text-[#f4cf8f]" />,
                type: "cancel",
            });
        } else if (error) {
            let message = "Something went wrong during checkout. Please try again or reach out if the issue persists.";
            if (error === "session_expired") message = "Your session has expired. Please log in again to continue.";

            setErrorData({
                title: "Oops! Something went wrong",
                message,
                icon: <AlertCircle className="h-12 w-12 text-red-400" />,
                type: "error",
            });
        } else {
            setErrorData(null);
        }
    }, [searchParams]);

    const handleClose = () => {
        setErrorData(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("status");
        url.searchParams.delete("error");
        router.push(url.pathname, { scroll: false });
    };

    return (
        <AnimatePresence>
            {errorData && (
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
                        className="relative w-full max-w-lg overflow-hidden rounded-[40px] border border-white/10 bg-[#2a2725] p-8 shadow-2xl sm:p-12 shadow-black/50"
                    >
                        {/* Decorative Background Accents */}
                        <div className={`absolute -left-20 -top-20 h-40 w-40 rounded-full blur-3xl ${errorData.type === 'error' ? 'bg-red-500/10' : 'bg-[#f4cf8f]/10'}`} />

                        <div className="relative text-center">
                            {/* Animated Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.2, stiffness: 200, damping: 10 }}
                                className={`mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl ring-1 ${errorData.type === 'error' ? 'bg-red-500/10 ring-red-500/20' : 'bg-[#f4cf8f]/10 ring-[#f4cf8f]/20'}`}
                            >
                                {errorData.icon}
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mb-4 font-serif text-3xl font-bold text-[#f1ebe2] sm:text-4xl"
                            >
                                {errorData.title}
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mb-10 text-lg text-[#c9c4bc] leading-relaxed"
                            >
                                {errorData.message}
                            </motion.p>

                            {/* Options */}
                            <div className="mb-10 space-y-4 text-left">
                                <motion.button
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 }}
                                    onClick={handleClose}
                                    className="flex w-full items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10 text-left"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                                        <RefreshCw className="h-5 w-5 text-[#f1ebe2]" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#f1ebe2]">Try Again</h4>
                                        <p className="text-sm text-[#c9c4bc]">Head back to the dashboard and try the checkout again.</p>
                                    </div>
                                </motion.button>

                                <motion.a
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 }}
                                    href="https://discord.com/channels/1441431610443694122/1441436739267858502"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10 no-underline"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4cf8f]/20">
                                        <MessageSquare className="h-5 w-5 text-[#f4cf8f]" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#f1ebe2]">Need Help?</h4>
                                        <p className="text-sm text-[#c9c4bc]">Ask a question in our Discord community.</p>
                                    </div>
                                </motion.a>
                            </div>

                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                onClick={handleClose}
                                className="group flex w-full h-14 items-center justify-center gap-2 rounded-full bg-white/5 border border-white/10 text-lg font-bold text-[#f1ebe2] transition-all hover:bg-white/10 cursor-pointer"
                            >
                                Close
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ErrorOverlay;
