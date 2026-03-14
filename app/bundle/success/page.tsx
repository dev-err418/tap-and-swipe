"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Copy, ArrowRight, Download } from "lucide-react";

const DOWNLOAD_URL = "https://github.com/dev-err418/app-sprint-aso-releases/releases/latest/download/AppSprintASO.dmg";

export default function BundleSuccessPage() {
    return (
        <Suspense>
            <BundleSuccessContent />
        </Suspense>
    );
}

function BundleSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");

    const [licenseKey, setLicenseKey] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!sessionId) {
            setError("Invalid session");
            setLoading(false);
            return;
        }

        fetch(`/api/aso/success?session_id=${sessionId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.licenseKey) {
                    setLicenseKey(data.licenseKey);
                } else {
                    setError(data.error || "Could not retrieve license key");
                }
            })
            .catch(() => setError("Something went wrong"))
            .finally(() => setLoading(false));
    }, [sessionId]);

    function handleCopy() {
        navigator.clipboard.writeText(licenseKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] font-sans selection:bg-[#f4cf8f]/30 flex items-center justify-center px-6">
            <div className="w-full max-w-lg text-center">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        <div className="mx-auto h-12 w-12 rounded-full border-2 border-[#f4cf8f]/30 border-t-[#f4cf8f] animate-spin" />
                        <p className="text-[#c9c4bc]">Getting your license key...</p>
                    </motion.div>
                ) : error ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <p className="text-red-400">{error}</p>
                        <a
                            href="/app-sprint-community"
                            className="inline-flex items-center gap-2 text-sm text-[#f4cf8f] hover:underline"
                        >
                            Back to App Sprint Community
                        </a>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-8"
                    >
                        <div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 200,
                                    delay: 0.2,
                                }}
                                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4cf8f]/20"
                            >
                                <Check className="h-8 w-8 text-[#f4cf8f]" />
                            </motion.div>
                            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                                Welcome to the bundle!
                            </h1>
                            <p className="mt-3 text-lg text-[#c9c4bc]">
                                Here's your ASO license key — we also sent it to your email.
                            </p>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="rounded-2xl border border-white/10 bg-white/5 p-8"
                        >
                            <p className="text-sm font-medium text-[#c9c4bc] mb-4">
                                Your license key
                            </p>
                            <p className="text-2xl font-mono font-bold tracking-wider text-[#f4cf8f] mb-6 select-all">
                                {licenseKey}
                            </p>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-[#f1ebe2] transition-all hover:bg-white/20"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-4 w-4 text-green-400" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        Copy to clipboard
                                    </>
                                )}
                            </button>
                        </motion.div>

                        <a
                            href={DOWNLOAD_URL}
                            className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4cf8f] text-sm font-bold text-[#2a2725] hover:bg-[#f4cf8f]/90 transition-all hover:ring-4 hover:ring-[#f4cf8f]/20"
                        >
                            <Download className="h-4 w-4" />
                            Download App Sprint ASO
                        </a>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="rounded-2xl border border-[#5865F2]/20 bg-[#5865F2]/5 p-6 space-y-4"
                        >
                            <h2 className="text-lg font-bold text-[#f1ebe2]">
                                Connect your Discord to access the Community
                            </h2>
                            <p className="text-sm text-[#c9c4bc]">
                                Join the private Discord, group calls, and the full 6-week roadmap.
                            </p>
                            <a
                                href="/api/auth/discord?flow=bundle"
                                className="group inline-flex h-11 items-center gap-2 rounded-full bg-[#5865F2] px-6 text-sm font-bold text-white transition-all hover:bg-[#4752C4] hover:ring-4 hover:ring-[#5865F2]/20"
                            >
                                Connect Discord
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </a>
                        </motion.div>

                    </motion.div>
                )}
            </div>
        </div>
    );
}
