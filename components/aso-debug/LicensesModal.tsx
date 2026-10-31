"use client";

import { useState } from "react";
import LicensesPanel from "./LicensesPanel";

export default function LicensesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Licenses
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-card overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Licenses</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none px-2"
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
