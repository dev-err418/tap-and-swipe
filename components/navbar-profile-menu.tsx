"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Mail, MessageCircle } from "lucide-react";

export default function NavbarProfileMenu({
  name,
  avatarUrl,
}: {
  name: string | null;
  avatarUrl: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    // Clear legacy Discord session too
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex cursor-pointer items-center"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name ?? "Profile"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl z-50">
          <div className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-black/30">
            Support
          </div>
          <a
            href="https://discord.com/users/1261628273465626725"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-black/60 transition-colors hover:bg-black/[0.04]"
          >
            <MessageCircle className="h-4 w-4" />
            Discord DM
          </a>
          <a
            href="mailto:arthurs.dev@gmail.com?subject=Tap%20%26%20Swipe%20Support"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-black/60 transition-colors hover:bg-black/[0.04]"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
          <div className="border-t border-black/10" />
          <button
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-black/60 transition-colors hover:bg-black/[0.04]"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
