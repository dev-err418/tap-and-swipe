"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Play, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

export default function VideoCard({
  id,
  title,
  description,
  youtubeUrl,
  order,
  completed: initialCompleted,
  index,
}: {
  id: string;
  title: string;
  description: string | null;
  youtubeUrl: string;
  order: number;
  completed: boolean;
  index: number;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Extract YouTube video ID for embed
  const ytMatch = youtubeUrl.match(
    /(?:v=|\/embed\/|youtu\.be\/)([\w-]{11})/
  );
  const ytId = ytMatch?.[1];

  async function toggleComplete() {
    const newCompleted = !completed;
    setCompleted(newCompleted);

    try {
      const res = await fetch("/api/roadmap/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: id, completed: newCompleted }),
      });

      if (!res.ok) {
        setCompleted(!newCompleted); // revert on error
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setCompleted(!newCompleted); // revert on error
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden"
    >
      <div className="flex items-center gap-4 p-5">
        <button
          onClick={toggleComplete}
          disabled={isPending}
          className="shrink-0 cursor-pointer"
        >
          {completed ? (
            <CheckCircle2 className="h-6 w-6 text-[#f4cf8f]" />
          ) : (
            <Circle className="h-6 w-6 text-[#c9c4bc]/40 hover:text-[#c9c4bc]" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#c9c4bc]/60 font-medium">
              {order}.
            </span>
            <h3
              className={`font-medium truncate ${
                completed
                  ? "text-[#c9c4bc] line-through"
                  : "text-[#f1ebe2]"
              }`}
            >
              {title}
            </h3>
          </div>
          {description && (
            <p className="text-sm text-[#c9c4bc]/60 mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-sm text-[#c9c4bc] hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Play className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Watch</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {expanded && ytId && (
        <div className="px-5 pb-5">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/20">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
