import { ArrowRight } from "lucide-react";

export default function AsoBundleButton() {
    return (
        <a
            href="/api/auth/discord?flow=bundle-aso"
            data-fast-goal="cta_pricing_clicked"
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4cf8f] text-sm font-bold text-[#2a2725] hover:bg-[#f4cf8f]/90 transition-all hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer mb-4"
        >
            <span>Get the Bundle</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
    );
}
