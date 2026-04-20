"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Mail, MessageCircle, Sun, Moon } from "lucide-react";
import ProgressBar from "./ProgressBar";

export default function RoadmapHeader({
  discordUsername,
  discordAvatar,
  discordId,
  totalLessons,
  completedLessons,
  theme,
}: {
  discordUsername: string;
  discordAvatar: string | null;
  discordId: string;
  totalLessons: number;
  completedLessons: number;
  theme: "light" | "dark";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const avatarUrl = discordAvatar
    ? `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png?size=64`
    : null;

  const percent =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function setTheme(t: "light" | "dark") {
    document.cookie = `roadmap-theme=${t};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/app-sprint-community");
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
        <div className="hidden sm:block">
          <div className="w-40" />
        </div>

        <div className="flex-1 max-w-xs hidden sm:block">
          <div className="flex items-center gap-3">
            <ProgressBar completed={completedLessons} total={totalLessons} />
            <span className="text-xs text-black/50 dark:text-white/50 whitespace-nowrap">
              {percent}%
            </span>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="text-sm text-black/50 dark:text-white/50 hidden sm:inline">
              {discordUsername}
            </span>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={discordUsername}
                width={32}
                height={32}
                loading="eager"
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[#FF9500]/10 flex items-center justify-center text-sm font-bold text-[#FF9500]">
                {discordUsername[0]?.toUpperCase()}
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#252525] shadow-xl overflow-hidden z-50">
              <div className="px-4 py-2 text-xs font-medium text-black/30 dark:text-white/30 uppercase tracking-wider">
                Theme
              </div>
              <div className="flex items-center gap-1 px-4 pb-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                    theme === "light"
                      ? "bg-[#FF9500]/10 text-[#FF9500]"
                      : "bg-black/[0.04] dark:bg-white/[0.06] text-black/50 dark:text-white/50 hover:bg-black/[0.08] dark:hover:bg-white/[0.10]"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                    theme === "dark"
                      ? "bg-[#FF9500]/10 text-[#FF9500]"
                      : "bg-black/[0.04] dark:bg-white/[0.06] text-black/50 dark:text-white/50 hover:bg-black/[0.08] dark:hover:bg-white/[0.10]"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Dark
                </button>
              </div>
              <div className="border-t border-black/10 dark:border-white/10" />
              <div className="px-4 py-2 text-xs font-medium text-black/30 dark:text-white/30 uppercase tracking-wider">
                Support
              </div>
              <a
                href="https://discord.com/users/1261628273465626725"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Discord DM
              </a>
              <a
                href="mailto:arthurs.dev@gmail.com?subject=AppSprint Support"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
              <div className="border-t border-black/10 dark:border-white/10" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
