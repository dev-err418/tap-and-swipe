import { Check } from "lucide-react";

interface BundleMiniCardProps {
    name: string;
    tagline: string;
    value?: string;
    features: string[];
    avatars?: string[];
    icon?: string;
    href?: string;
}

export default function BundleMiniCard({ name, tagline, value, features, avatars, icon, href }: BundleMiniCardProps) {
    const Wrapper = href ? "a" : "div";
    const wrapperProps = href ? { href, target: "_blank", rel: "noopener noreferrer" } : {};

    return (
        <Wrapper {...wrapperProps} className="block w-full rounded-2xl border border-black/10 bg-black/[0.03] p-5 relative transition-colors hover:bg-black/[0.06]">
            {icon && (
                <div className="absolute -top-3 -right-2 h-11 w-11">
                    <div className="absolute inset-0 rounded-[12px] bg-black/85 border border-black/15" />
                    <img src={icon} alt={name} className="relative h-full w-full rounded-[12px] p-1" />
                </div>
            )}
            <div className="flex items-center justify-between mb-2">
                <p className="text-base font-bold text-black">{name}</p>
                {value && <span className="text-xs text-black/30">{value}</span>}
            </div>
            <p className="text-sm text-black/50 mb-4">{tagline}</p>
            {avatars && (
                <div className="flex -space-x-2 mb-4">
                    {avatars.map((src, i) => (
                        <img
                            key={i}
                            className="h-9 w-9 rounded-full border-2 border-white object-cover"
                            src={src}
                            alt="Member"
                        />
                    ))}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-black/10 text-xs font-bold text-black/50">
                        63+
                    </span>
                </div>
            )}
            <ul className="space-y-2.5">
                {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                        <span className="text-sm font-medium text-black">{f}</span>
                    </li>
                ))}
            </ul>
        </Wrapper>
    );
}
