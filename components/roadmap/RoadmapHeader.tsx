"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import ProgressBar from "./ProgressBar";

export default function RoadmapHeader({
  discordUsername,
  discordAvatar,
  discordId,
  totalLessons,
  completedLessons,
}: {
  discordUsername: string;
  discordAvatar: string | null;
  discordId: string;
  totalLessons: number;
  completedLessons: number;
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/app-sprint");
  }

  return (
    <header className="border-b border-white/5 bg-[#2a2725]">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
        <div className="w-40 hidden sm:block" />

        <div className="flex-1 max-w-xs hidden sm:block">
          <div className="flex items-center gap-3">
            <ProgressBar completed={completedLessons} total={totalLessons} />
            <span className="text-xs text-[#c9c4bc] whitespace-nowrap">
              {percent}%
            </span>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="text-sm text-[#c9c4bc] hidden sm:inline">
              {discordUsername}
            </span>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={discordUsername}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[#f4cf8f]/20 flex items-center justify-center text-sm font-bold text-[#f4cf8f]">
                {discordUsername[0]?.toUpperCase()}
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/10 bg-[#2a2725] shadow-xl overflow-hidden z-50">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-[#c9c4bc] hover:bg-white/10 transition-colors cursor-pointer"
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
