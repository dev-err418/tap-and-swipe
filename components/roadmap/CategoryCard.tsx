"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProgressBar from "./ProgressBar";

export default function CategoryCard({
  slug,
  title,
  emoji,
  totalVideos,
  completedVideos,
  index,
}: {
  slug: string;
  title: string;
  emoji: string;
  totalVideos: number;
  completedVideos: number;
  index: number;
}) {
  const isComplete = totalVideos > 0 && completedVideos === totalVideos;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link
        href={`/app-sprint/roadmap/${slug}`}
        className="group block rounded-3xl border border-white/5 bg-white/5 p-6 transition-all hover:bg-white/10 hover:border-white/10"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-3xl">{emoji}</span>
          {isComplete && (
            <span className="rounded-full bg-[#f4cf8f]/10 px-3 py-1 text-xs font-bold text-[#f4cf8f]">
              Complete
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-[#f1ebe2] mb-2">{title}</h3>

        <div className="mb-3">
          <ProgressBar completed={completedVideos} total={totalVideos} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[#c9c4bc]">
            {completedVideos}/{totalVideos} videos
          </span>
          <ArrowRight className="h-4 w-4 text-[#c9c4bc] transition-transform group-hover:translate-x-1 group-hover:text-[#f4cf8f]" />
        </div>
      </Link>
    </motion.div>
  );
}
