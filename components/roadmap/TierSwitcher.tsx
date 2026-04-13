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
              ? "bg-[#FF9500]/10 border-[#FF9500]/30 text-[#FF9500]"
              : "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:bg-black/[0.08] dark:hover:bg-white/[0.10]"
          }`}
        >
          {t.label}
        </button>
      ))}
      <button
        onClick={clearOverride}
        className="px-2 py-1 text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors cursor-pointer"
        title="Reset to real tier"
      >
        ×
      </button>
    </div>
  );
}
