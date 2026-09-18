"use client";

import { useState } from "react";

export default function DeadProjectsDisclosure({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      {open ? (
        <section className="space-y-6">
          <h3 className="text-lg font-semibold tracking-tight text-black/55">Dead project</h3>
          {children}
        </section>
      ) : null}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="text-sm font-medium text-black/45 transition-colors hover:text-black"
        >
          {open ? "See less" : "See more"}
        </button>
      </div>
    </div>
  );
}
