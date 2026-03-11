"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function SubscribeButton() {
    const [loading, setLoading] = useState(false);

    async function handleSubscribe() {
        setLoading(true);
        try {
            const res = await fetch("/api/aso/checkout", { method: "POST" });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleSubscribe}
            disabled={loading}
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4cf8f] text-sm font-bold text-[#2a2725] hover:bg-[#f4cf8f]/90 transition-all hover:ring-4 hover:ring-[#f4cf8f]/20 disabled:opacity-50 mb-4"
        >
            {loading ? "Redirecting..." : "Subscribe"}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
        </button>
    );
}
