"use client";

import { motion } from "framer-motion";

export default function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="relative h-6 w-full rounded-full bg-black/10 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-black"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {/* Dark text on unfilled area */}
      <span className="absolute inset-0 flex items-center px-2.5 text-xs font-medium text-black/50">
        {percent}%
      </span>
      {/* White text on filled area */}
      <span
        className="absolute inset-0 flex items-center px-2.5 text-xs font-medium text-white overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
      >
        {percent}%
      </span>
    </div>
  );
}
