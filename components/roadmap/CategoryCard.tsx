"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProgressBar from "./ProgressBar";

export default function CategoryCard({
  slug,
  title,
  subtitle,
  completedLessons,
  totalLessons,
  image,
  index,
}: {
  slug: string;
  title: string;
  subtitle: string;
  completedLessons: number;
  totalLessons: number;
  image?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link
        href={`/learn/classroom/${slug}`}
        className="group block overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02] transition-all hover:bg-black/[0.04] hover:border-black/15"
      >
        {image ? (
          <img src={image} alt={title} className="aspect-video w-full object-cover" />
        ) : (
          <div className="aspect-video w-full bg-black/[0.04]" />
        )}
        <div className="p-4">
          <h3 className="flex items-center gap-1.5 font-semibold text-black">
            {title}
            <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
          </h3>
          <p className="mt-1 text-sm text-black/50">
            {subtitle}
          </p>
          <div className="mt-3">
            <ProgressBar completed={completedLessons} total={totalLessons} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
