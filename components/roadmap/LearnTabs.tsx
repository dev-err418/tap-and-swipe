"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Community", href: "/learn/community", disabled: true },
  { label: "Classroom", href: "/learn/classroom", disabled: false },
  { label: "Calendar", href: "/learn/calendar", disabled: false },
] as const;

export default function LearnTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-8 border-b border-black/10">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);

        if (tab.disabled) {
          return (
            <span
              key={tab.label}
              className="relative pb-3 text-sm font-medium text-black/25 cursor-default select-none"
            >
              {tab.label}
              <span className="ml-1.5 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-black/30">
                Soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              active ? "text-black" : "text-black/40 hover:text-black/60"
            }`}
          >
            {tab.label}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-black" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
