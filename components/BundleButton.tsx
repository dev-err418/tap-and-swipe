import { ArrowRight } from "lucide-react";

export default function BundleButton() {
    return (
        <a
            href="/api/auth/discord?flow=bundle-community"
            data-fast-goal="cta_pricing_clicked"
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4cf8f] text-sm font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer mb-4"
        >
            <span>Get the Bundle</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </a>
    );
}
