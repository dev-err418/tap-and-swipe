"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import ProgressBar from "./ProgressBar";

export default function CategoryCard({
  slug,
  title,
  emoji,
  totalLessons,
  completedLessons,
  index,
  hideProgress,
  locked,
}: {
  slug: string;
  title: string;
  emoji: string;
  totalLessons: number;
  completedLessons: number;
  index: number;
  hideProgress?: boolean;
  locked?: boolean;
}) {
  const isComplete =
    !hideProgress && !locked && totalLessons > 0 && completedLessons === totalLessons;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      {locked && totalLessons === 0 ? (
        <div className="block rounded-3xl border border-white/5 bg-white/5 p-6 opacity-50 cursor-default">
          <div className="mb-4">
            <span className="text-3xl">{emoji}</span>
          </div>

          <h3 className="text-lg font-bold text-[#f1ebe2] mb-2">{title}</h3>

          <div className="mb-3">
            <ProgressBar completed={0} total={1} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[#c9c4bc]">Coming soon</span>
            <Lock className="h-4 w-4 text-[#c9c4bc]/40" />
          </div>
        </div>
      ) : (
        <Link
          href={`/app-sprint/roadmap/${slug}`}
          className={`group block rounded-3xl border border-white/5 bg-white/5 p-6 transition-all hover:bg-white/10 hover:border-white/10 ${locked ? "opacity-75" : ""}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-3xl">{emoji}</span>
            {isComplete ? (
              <span className="rounded-full bg-[#f4cf8f]/10 px-3 py-1 text-xs font-bold text-[#f4cf8f]">
                Complete
              </span>
            ) : null}
          </div>

          <h3 className="text-lg font-bold text-[#f1ebe2] mb-2">{title}</h3>

          {!hideProgress && (
            <div className="mb-3">
              <ProgressBar completed={locked ? 0 : completedLessons} total={totalLessons} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-[#c9c4bc]">
              {hideProgress
                ? `${totalLessons} replay${totalLessons !== 1 ? "s" : ""}`
                : locked
                  ? `${totalLessons} lesson${totalLessons !== 1 ? "s" : ""}`
                  : `${completedLessons}/${totalLessons} lessons`}
            </span>
            {locked ? (
              <Lock className="h-4 w-4 text-[#c9c4bc]/40" />
            ) : (
              <ArrowRight className="h-4 w-4 text-[#c9c4bc] transition-transform group-hover:translate-x-1 group-hover:text-[#f4cf8f]" />
            )}
          </div>
        </Link>
      )}
    </motion.div>
  );
}
