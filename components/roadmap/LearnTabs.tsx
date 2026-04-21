"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Community", href: "/learn/community" },
  { label: "Classroom", href: "/learn/classroom" },
  { label: "Calendar", href: "/learn/calendar" },
];

export default function LearnTabs({ hasDiscord = true }: { hasDiscord?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8 border-b border-black/10">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const showBadge = tab.label === "Community" && !hasDiscord;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              active ? "text-black" : "text-black/40 hover:text-black/60"
            }`}
          >
            {tab.label}
            {showBadge && (
              <span className="absolute -top-1 -right-4 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF9500] text-[10px] font-bold text-white">
                1
              </span>
            )}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-black" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
