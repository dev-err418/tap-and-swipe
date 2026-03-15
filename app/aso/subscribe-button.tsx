"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { getVisitorId, getSessionId } from "@/components/PageTracker";

export default function SubscribeButton({
    plan,
    interval,
}: {
    plan: "solo" | "pro";
    interval: "month" | "year";
}) {
    const [loading, setLoading] = useState(false);

    const label = "Start 7-day free trial";

    async function handleSubscribe() {
        setLoading(true);
        try {
            const visitorId = getVisitorId();
            const sessionId = getSessionId("aso");

            // Track CTA click
            fetch("/api/event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product: plan === "solo" ? "aso-solo" : "aso-pro", type: "cta_clicked", visitorId, sessionId }),
            }).catch(() => {});

            const res = await fetch("/api/aso/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan, interval }),
            });
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
            data-track="cta"
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4cf8f] text-sm font-bold text-[#2a2725] hover:bg-[#f4cf8f]/90 transition-all hover:ring-4 hover:ring-[#f4cf8f]/20 disabled:opacity-50 mb-4"
        >
            {loading ? "Redirecting..." : label}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
        </button>
    );
}
