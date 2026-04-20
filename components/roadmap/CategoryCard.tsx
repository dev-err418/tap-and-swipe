"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProgressBar from "./ProgressBar";

export default function CategoryCard({
  slug,
  title,
  emoji,
  totalLessons,
  completedLessons,
  index,
  hideProgress,
}: {
  slug: string;
  title: string;
  emoji: string;
  totalLessons: number;
  completedLessons: number;
  index: number;
  hideProgress?: boolean;
}) {
  const isComplete =
    !hideProgress && totalLessons > 0 && completedLessons === totalLessons;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link
        href={`/learn/${slug}`}
        className="group block rounded-3xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-6 transition-all hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-black/15 dark:hover:border-white/15"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-3xl">{emoji}</span>
          {isComplete ? (
            <span className="rounded-full bg-[#FF9500]/10 px-3 py-1 text-xs font-bold text-[#FF9500]">
              Complete
            </span>
          ) : null}
        </div>

        <h3 className="text-lg font-bold text-black dark:text-white mb-2">{title}</h3>

        {!hideProgress && (
          <div className="mb-3">
            <ProgressBar completed={completedLessons} total={totalLessons} />
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-black/50 dark:text-white/50">
            {hideProgress
              ? `${totalLessons} replay${totalLessons !== 1 ? "s" : ""}`
              : `${completedLessons}/${totalLessons} lessons`}
          </span>
          <ArrowRight className="h-4 w-4 text-black/40 dark:text-white/40 transition-transform group-hover:translate-x-1 group-hover:text-[#FF9500]" />
        </div>
      </Link>
    </motion.div>
  );
}
