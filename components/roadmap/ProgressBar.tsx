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
    <div className="relative h-6 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-[#FF9500]"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <span className="absolute inset-0 flex items-center px-2.5 text-xs font-medium text-black/70 dark:text-white/70">
        {percent}%
      </span>
    </div>
  );
}
