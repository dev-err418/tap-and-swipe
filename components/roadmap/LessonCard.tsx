"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Play,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MarkdownContent from "./MarkdownContent";

export default function LessonCard({
  id,
  title,
  description,
  type,
  youtubeUrl,
  markdownContent,
  order,
  completed: initialCompleted,
  index,
  isLast,
  hideProgress,
}: {
  id: string;
  title: string;
  description: string | null;
  type: string;
  youtubeUrl: string | null;
  markdownContent: string | null;
  order: number;
  completed: boolean;
  index: number;
  isLast?: boolean;
  hideProgress?: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
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
  const comingSoon = isVideo && !youtubeUrl;

  // Extract YouTube video ID for embed
  const ytMatch = youtubeUrl?.match(
    /(?:v=|\/embed\/|youtu\.be\/)([\w-]{11})/
  );
  const ytId = ytMatch?.[1];

  async function toggleComplete(openNext = false) {
    const newCompleted = !completed;
    setCompleted(newCompleted);

    try {
      const res = await fetch("/api/roadmap/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: id, completed: newCompleted }),
      });

      if (!res.ok) {
        setCompleted(!newCompleted);
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

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setCompleted(!newCompleted);
    }
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden"
    >
      <div className={`flex items-center gap-4 p-5 ${comingSoon ? "opacity-50" : ""}`}>
        {hideProgress ? null : !comingSoon ? (
          <button
            onClick={() => toggleComplete()}
            disabled={isPending}
            className="shrink-0 cursor-pointer"
          >
            {completed ? (
              <CheckCircle2 className="h-6 w-6 text-[#f4cf8f]" />
            ) : (
              <Circle className="h-6 w-6 text-[#c9c4bc]/40 hover:text-[#c9c4bc]" />
            )}
          </button>
        ) : (
          <div className="shrink-0">
            <Circle className="h-6 w-6 text-[#c9c4bc]/20" />
          </div>
        )}

        {comingSoon ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[#c9c4bc]/60 font-medium">
                {order}.
              </span>
              <h3 className="font-medium truncate text-[#c9c4bc]/60">
                {title}
              </h3>
            </div>
            {description && (
              <p className="text-sm text-[#c9c4bc]/40 mt-0.5 truncate">
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
              <span className="text-[#c9c4bc]/60 font-medium">
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
          </button>
        )}

        {comingSoon ? (
          <span className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-xs text-[#c9c4bc]/40">
            Coming soon
          </span>
        ) : (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-sm text-[#c9c4bc] hover:bg-white/10 transition-colors cursor-pointer"
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

      {expanded && isVideo && ytId && (
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

      {expanded && isVideo && markdownContent && (
        <div className="px-5 pb-5">
          <div className="rounded-xl bg-black/10 px-6 pt-4 pb-0">
            <MarkdownContent content={markdownContent} />
          </div>
        </div>
      )}

      {expanded && !isVideo && markdownContent && (
        <div className="px-5 pb-5">
          <div className="rounded-xl bg-black/10 p-6">
            <MarkdownContent content={markdownContent} />
          </div>
        </div>
      )}

      {expanded && !completed && !hideProgress && (
        <div className="flex justify-end px-5 pb-5">
          <button
            onClick={() => toggleComplete(true)}
            disabled={isPending}
            className="flex items-center gap-2 rounded-full bg-[#f4cf8f] px-4 py-2 text-sm font-medium text-[#2a2725] hover:bg-[#f4cf8f]/90 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Done
          </button>
        </div>
      )}
    </motion.div>
  );
}
