"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Community", href: "/learn/community" },
  { label: "Classroom", href: "/learn/classroom" },
  { label: "Calendar", href: "/learn/calendar" },
];

export default function LearnTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-8 border-b border-black/10">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
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
