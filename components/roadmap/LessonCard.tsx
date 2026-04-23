"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Play,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import MarkdownContent from "./MarkdownContent";

export default function LessonCard({
  id,
  title,
  description,
  type,
  videoUrl,
  youtubeUrl,
  markdownContent,
  order,
  completed: initialCompleted,
  index,
  hideProgress,
  onToggle,
}: {
  id: string;
  title: string;
  description: string | null;
  type: string;
  videoUrl: string | null;
  youtubeUrl: string | null;
  markdownContent: string | null;
  order: number;
  completed: boolean;
  index: number;
  hideProgress?: boolean;
  onToggle?: (lessonId: string, completed: boolean) => void;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [expanded, setExpanded] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Listen for "open this card" event from previous card's Done button
  const expand = useCallback(() => setExpanded(true), []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.addEventListener("lesson-open", expand);
    return () => el.removeEventListener("lesson-open", expand);
  }, [expand]);

  const isVideo = type === "video";
  const hasVideo = !!videoUrl || !!youtubeUrl;
  const comingSoon = isVideo && !hasVideo;

  // Extract YouTube video ID for embed
  const ytMatch = youtubeUrl?.match(
    /(?:v=|\/embed\/|youtu\.be\/)([\w-]{11})/
  );
  const ytId = ytMatch?.[1];

  async function toggleComplete(openNext = false) {
    const newCompleted = !completed;
    setCompleted(newCompleted);
    onToggle?.(id, newCompleted);
    setIsPending(true);

    try {
      const res = await fetch("/api/learn/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: id, completed: newCompleted }),
      });

      if (!res.ok) {
        setCompleted(!newCompleted);
        onToggle?.(id, !newCompleted);
        return;
      }

      if (openNext && newCompleted && cardRef.current) {
        const nextCard = cardRef.current.nextElementSibling as HTMLElement | null;
        if (nextCard) {
          setExpanded(false);
          nextCard.dispatchEvent(new CustomEvent("lesson-open"));
          setTimeout(() => {
            nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      }
    } catch {
      setCompleted(!newCompleted);
      onToggle?.(id, !newCompleted);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-2xl border border-black/10 bg-black/[0.02] overflow-hidden"
    >
      <div className={`flex items-center gap-4 p-5 ${comingSoon ? "opacity-50" : ""}`}>
        {hideProgress ? null : !comingSoon ? (
          <button
            onClick={() => toggleComplete()}
            disabled={isPending}
            className="shrink-0 cursor-pointer"
          >
            {completed ? (
              <CheckCircle2 className="h-6 w-6 text-[#FF9500]" />
            ) : (
              <Circle className="h-6 w-6 text-black/20 hover:text-black/40" />
            )}
          </button>
        ) : (
          <div className="shrink-0">
            <Circle className="h-6 w-6 text-black/15" />
          </div>
        )}

        {comingSoon ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-black/30 font-medium">
                {order}.
              </span>
              <h3 className="font-medium truncate text-black/30">
                {title}
              </h3>
            </div>
            {description && (
              <p className="text-sm text-black/20 mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 min-w-0 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-black/30 font-medium">
                {order}.
              </span>
              <h3
                className={`font-medium truncate ${
                  completed
                    ? "text-black/40 line-through"
                    : "text-black"
                }`}
              >
                {title}
              </h3>
            </div>
            {description && (
              <p className="text-sm text-black/40 mt-0.5 truncate">
                {description}
              </p>
            )}
          </button>
        )}

        {comingSoon ? (
          <span className="shrink-0 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-black/30">
            Coming soon
          </span>
        ) : (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 flex items-center gap-1 rounded-full bg-black/[0.04] px-3 py-1.5 text-sm text-black/50 hover:bg-black/[0.08] transition-colors cursor-pointer"
          >
            {isVideo ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <BookOpen className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {isVideo ? "Watch" : "Read"}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      {expanded && isVideo && videoUrl && (
        <div className="px-5 pb-5">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/5">
            <video
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      )}

      {expanded && isVideo && !videoUrl && ytId && (
        <div className="px-5 pb-5">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/5">
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

      {expanded && isVideo && markdownContent && (
        <div className="px-5 pb-5">
          <div className="rounded-xl bg-black/[0.03] px-6 pt-4 pb-1">
            <MarkdownContent content={markdownContent} />
          </div>
        </div>
      )}

      {expanded && !isVideo && markdownContent && (
        <div className="px-5 pb-5">
          <div className="rounded-xl bg-black/[0.03] p-6">
            <MarkdownContent content={markdownContent} />
          </div>
        </div>
      )}

      {expanded && !completed && !hideProgress && (
        <div className="flex justify-end px-5 pb-5">
          <button
            onClick={() => toggleComplete(true)}
            disabled={isPending}
            className="flex items-center gap-2 rounded-full bg-[#FF9500] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF9500]/85 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Done
          </button>
        </div>
      )}
    </motion.div>
  );
}
