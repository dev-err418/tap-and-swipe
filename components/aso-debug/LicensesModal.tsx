"use client";

import { useState } from "react";
import LicensesPanel from "./LicensesPanel";

export default function LicensesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-[#f4cf8f] text-[#2a2725] text-sm font-medium hover:bg-[#e8c27f] transition-colors"
      >
        Licenses
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#2a2725] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#f1ebe2]">Licenses</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors text-xl leading-none px-2"
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
