"use client";

import { track } from "@vercel/analytics";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function Tracker() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const source = searchParams.get("source") || searchParams.get("utm_source") || searchParams.get("v");
        if (source) {
            track("visit_source", {
                source: source,
                path: window.location.pathname
            });
            console.log(`[Analytics] Tracked source: ${source}`);
        }
    }, [searchParams]);

    return null;
}

export default function AnalyticsTracker() {
    return (
        <Suspense fallback={null}>
            <Tracker />
        </Suspense>
    );
}
