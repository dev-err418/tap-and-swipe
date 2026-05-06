"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { CheckCircle2, Circle, Link2, Check } from "lucide-react";
import ProgressBar from "./ProgressBar";
import MarkdownContent from "./MarkdownContent";
import { buildLessonShortPath } from "@/lib/roadmap";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  videoUrl: string | null;
  youtubeUrl: string | null;
  markdownContent: string | null;
  sectionType: string | null;
  order: number;
};

export default function LessonListClient({
  lessons,
  initialCompletedIds,
  hideProgress,
  categoryTitle,
  categorySubtitle,
  categorySlug,
  initialLessonId,
  isAdmin = false,
}: {
  lessons: Lesson[];
  initialCompletedIds: string[];
  hideProgress: boolean;
  categoryTitle: string;
  categorySubtitle: string;
  categorySlug: string;
  initialLessonId?: string | null;
  isAdmin?: boolean;
}) {
  const [completedIds, setCompletedIds] = useState(
    () => new Set(initialCompletedIds)
  );

  const defaultLessonId = useMemo(() => {
    if (initialLessonId && lessons.some((l) => l.id === initialLessonId)) {
      return initialLessonId;
    }
    const firstUncompleted = lessons.find(
      (l) => !initialCompletedIds.includes(l.id) && l.sectionType !== "github-connect"
    );
    return firstUncompleted?.id ?? lessons[0]?.id ?? null;
  }, [lessons, initialCompletedIds, initialLessonId]);

  const [selectedId, setSelectedId] = useState<string | null>(defaultLessonId);
  const [copied, setCopied] = useState(false);

  const selectLesson = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("lesson", id);
        window.history.replaceState(null, "", url.toString());
      }
    },
    []
  );

  const copyShareLink = useCallback(async () => {
    if (!selectedId || typeof window === "undefined") return;
    const shortPath = buildLessonShortPath(categorySlug, selectedId);
    const url = shortPath
      ? `${window.location.origin}${shortPath}`
      : `${window.location.origin}/learn/classroom/${categorySlug}?lesson=${selectedId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [selectedId, categorySlug]);

  useEffect(() => {
    if (!initialLessonId) return;
    const el = document.querySelector(`[data-lesson-id="${initialLessonId}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [initialLessonId]);

  const selectedLesson = lessons.find((l) => l.id === selectedId) ?? null;
  const completedCount = completedIds.size;
  const [isPending, setIsPending] = useState(false);

  const onToggle = useCallback(
    async (lessonId: string, newCompleted: boolean) => {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (newCompleted) next.add(lessonId);
        else next.delete(lessonId);
        return next;
      });
      setIsPending(true);

      try {
        const res = await fetch("/api/learn/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, completed: newCompleted }),
        });

        if (!res.ok) {
          setCompletedIds((prev) => {
            const next = new Set(prev);
            if (newCompleted) next.delete(lessonId);
            else next.add(lessonId);
            return next;
          });
          return;
        }

        // Auto-advance to next uncompleted lesson
        if (newCompleted) {
          const currentIndex = lessons.findIndex((l) => l.id === lessonId);
          const nextUncompleted = lessons.find(
            (l, i) =>
              i > currentIndex &&
              !completedIds.has(l.id) &&
              l.id !== lessonId &&
              l.sectionType !== "github-connect"
          );
          if (nextUncompleted) {
            selectLesson(nextUncompleted.id);
          }
        }
      } catch {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          if (newCompleted) next.delete(lessonId);
          else next.add(lessonId);
          return next;
        });
      } finally {
        setIsPending(false);
      }
    },
    [lessons, completedIds, selectLesson]
  );

  const isVideo = selectedLesson?.type === "video";
  const hasVideo = !!selectedLesson?.videoUrl || !!selectedLesson?.youtubeUrl;
  const ytMatch = selectedLesson?.youtubeUrl?.match(
    /(?:v=|\/embed\/|youtu\.be\/)([\w-]{11})/
  );
  const ytId = ytMatch?.[1];
  const isCompleted = selectedLesson ? completedIds.has(selectedLesson.id) : false;

  return (
    <div className="flex gap-8">
      {/* Left: Table of contents */}
      <div className="w-72 shrink-0 hidden lg:block">
        <div className="sticky top-8">
          <h2 className="text-lg font-bold text-black">{categoryTitle}</h2>
          <p className="mt-1 text-sm text-black/50">{categorySubtitle}</p>

          {!hideProgress && (
            <div className="mt-4 mb-4">
              <ProgressBar completed={completedCount} total={lessons.length} />
            </div>
          )}

          <nav className="space-y-0.5">
            {lessons.map((lesson) => {
              const isActive = lesson.id === selectedId;
              const isDone = completedIds.has(lesson.id);
              const isGithub = lesson.sectionType === "github-connect";
              const comingSoon =
                lesson.type === "video" && !lesson.videoUrl && !lesson.youtubeUrl;

              if (isGithub) return null;

              return (
                <button
                  key={lesson.id}
                  data-lesson-id={lesson.id}
                  onClick={() => selectLesson(lesson.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-black/[0.06] text-black font-medium"
                      : "text-black/50 hover:bg-black/[0.03] hover:text-black/70"
                  } ${comingSoon ? "opacity-40" : ""}`}
                >
                  {hideProgress ? (
                    <span className="shrink-0 text-xs text-black/30 w-5 text-center">
                      {lesson.order}
                    </span>
                  ) : isDone ? (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); onToggle(lesson.id, false); }}
                      className="shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-black" />
                    </span>
                  ) : (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); if (!comingSoon) onToggle(lesson.id, true); }}
                      className="shrink-0 cursor-pointer"
                    >
                      <Circle className="h-4 w-4 text-black/20 hover:text-black/40" />
                    </span>
                  )}
                  <span className={`truncate ${isDone && !isActive ? "line-through text-black/30" : ""}`}>
                    {lesson.title}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Right: Content */}
      <div className="flex-1 min-w-0">
        {selectedLesson ? (
          <div className="rounded-2xl border border-black/10 bg-white p-6 space-y-6">
            {/* Header: title, subtitle, share, done */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-black">
                    {selectedLesson.title}
                  </h2>
                  {isAdmin && (
                    <button
                      onClick={copyShareLink}
                      title="Copy share link"
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-black/60 hover:text-black hover:bg-black/[0.04] transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3.5 w-3.5" />
                          Share
                        </>
                      )}
                    </button>
                  )}
                </div>
                {selectedLesson.description && (
                  <p className="mt-1 text-sm text-black/50">
                    {selectedLesson.description}
                  </p>
                )}
              </div>
              {!hideProgress && selectedLesson.sectionType !== "github-connect" && (
                <button
                  onClick={() => onToggle(selectedLesson.id, !isCompleted)}
                  disabled={isPending}
                  className={`shrink-0 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    isCompleted
                      ? "bg-black/[0.04] text-black/50 hover:bg-black/[0.08]"
                      : "bg-black text-white hover:bg-black/85"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isCompleted ? "Completed" : "Mark as done"}
                </button>
              )}
            </div>

            {/* Video player */}
            {isVideo && selectedLesson.videoUrl && (
              <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black">
                <video
                  key={selectedLesson.id}
                  src={selectedLesson.videoUrl}
                  controls
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            )}

            {isVideo && !selectedLesson.videoUrl && ytId && (
              <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                  key={selectedLesson.id}
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={selectedLesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            )}

            {isVideo && !hasVideo && (
              <div className="flex items-center justify-center aspect-video overflow-hidden rounded-xl bg-black/[0.03]">
                <span className="text-sm text-black/30">Coming soon</span>
              </div>
            )}

            {/* Markdown content */}
            {selectedLesson.markdownContent && (
              <div>
                {isVideo && (
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/40">
                    Resources
                  </h3>
                )}
                <MarkdownContent content={selectedLesson.markdownContent} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-black/30 text-sm">
            Select a lesson to get started
          </div>
        )}
      </div>

    </div>
  );
}
