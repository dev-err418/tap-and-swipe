"use client";

import { useState } from "react";

export default function ExpandableGroup({
  icon,
  label,
  count,
  pct,
  subRows,
  total,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  pct: number;
  subRows: { source: string | null; label: string; count: number }[];
  total: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="border-b border-white/5 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="py-2">
          <span className="flex items-center">
            <span
              className={`mr-1.5 text-[10px] text-[#c9c4bc] transition-transform ${open ? "rotate-90" : ""}`}
            >
              &#9654;
            </span>
            {icon}
            {label}
          </span>
        </td>
        <td className="py-2 text-right tabular-nums">{count}</td>
        <td className="py-2 text-right tabular-nums text-[#c9c4bc]">{pct}%</td>
      </tr>
      {open &&
        subRows.map((r) => (
          <tr key={r.source} className="border-b border-white/5 text-[#c9c4bc]">
            <td className="py-1.5 pl-8">{r.label}</td>
            <td className="py-1.5 text-right tabular-nums">{r.count}</td>
            <td className="py-1.5 text-right tabular-nums">
              {total > 0 ? Math.round((r.count / total) * 100) : 0}%
            </td>
          </tr>
        ))}
    </>
  );
}
