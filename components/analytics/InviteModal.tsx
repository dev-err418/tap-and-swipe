"use client";

import { useState } from "react";
import InviteManager from "./InviteManager";

interface Invite {
  id: string;
  token: string;
  tier: string;
  url: string;
  used: boolean;
  usedAt: string | null;
  discordId: string | null;
  createdAt: string;
}

export default function InviteModal({ initialInvites }: { initialInvites: Invite[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-[#f4cf8f] text-[#2a2725] text-sm font-medium hover:bg-[#e8c27f] transition-colors"
      >
        Invite links
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#2a2725] p-6 m-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#f1ebe2]">Invite links</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <InviteManager initialInvites={initialInvites} />
          </div>
        </div>
      )}
    </>
  );
}
