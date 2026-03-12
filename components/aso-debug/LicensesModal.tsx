"use client";

import { useState } from "react";
import LicensesPanel from "./LicensesPanel";

export default function LicensesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-[#c9c4bc] hover:text-[#f1ebe2] hover:bg-white/10 transition-colors"
      >
        Licenses
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Sheet */}
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#2a2725] p-6 m-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#f1ebe2]">Licenses</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <LicensesPanel />
          </div>
        </div>
      )}
    </>
  );
}
