import { Check } from "lucide-react";

interface BundleMiniCardProps {
    name: string;
    tagline: string;
    value?: string;
    features: string[];
    avatars?: string[];
    icon?: string;
}

export default function BundleMiniCard({ name, tagline, value, features, avatars, icon }: BundleMiniCardProps) {
    return (
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 relative">
            {icon && (
                <div className="absolute -top-3 -right-2 h-11 w-11">
                    <div className="absolute inset-0 rounded-[12px] bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-xl border border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]" />
                    <img src={icon} alt={name} className="relative h-full w-full rounded-[12px] p-1" />
                </div>
            )}
            <div className="flex items-center justify-between mb-2">
                <p className="text-base font-bold text-[#f4cf8f]">{name}</p>
                {value && <span className="text-xs text-[#c9c4bc]/60">{value}</span>}
            </div>
            <p className="text-sm text-[#c9c4bc] mb-4">{tagline}</p>
            {avatars && (
                <div className="flex -space-x-2 mb-4">
                    {avatars.map((src, i) => (
                        <img
                            key={i}
                            className="h-9 w-9 rounded-full border-2 border-[#2a2725] object-cover"
                            src={src}
                            alt="Member"
                        />
                    ))}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#2a2725] bg-white/10 text-xs font-bold text-[#c9c4bc]">
                        51+
                    </span>
                </div>
            )}
            <ul className="space-y-2.5">
                {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#f4cf8f]" />
                        <span className="text-sm font-medium text-[#f1ebe2]">{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
