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
    <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-[#FF9500]"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}
