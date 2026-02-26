"use client";

import { useRouter } from "next/navigation";
import type { UserTier } from "@/lib/premium";

const TIERS: { value: UserTier; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "boilerplate", label: "Boilerplate" },
  { value: "full", label: "Full" },
];

export default function TierSwitcher({ currentTier }: { currentTier: UserTier }) {
  const router = useRouter();

  function switchTier(tier: UserTier) {
    document.cookie = `debug-tier=${tier};path=/;max-age=86400`;
    router.refresh();
  }

  function clearOverride() {
    document.cookie = "debug-tier=;path=/;max-age=0";
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      {TIERS.map((t) => (
        <button
          key={t.value}
          onClick={() => switchTier(t.value)}
          className={`px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
            currentTier === t.value
              ? "bg-[#f4cf8f]/20 border-[#f4cf8f]/40 text-[#f4cf8f]"
              : "bg-white/5 border-white/10 text-[#c9c4bc] hover:bg-white/10"
          }`}
        >
          {t.label}
        </button>
      ))}
      <button
        onClick={clearOverride}
        className="px-2 py-1 text-xs text-[#c9c4bc]/50 hover:text-[#c9c4bc] transition-colors cursor-pointer"
        title="Reset to real tier"
      >
        ×
      </button>
    </div>
  );
}
