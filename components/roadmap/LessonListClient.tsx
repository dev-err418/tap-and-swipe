"use client";

import { useState, useCallback } from "react";
import LessonCard from "./LessonCard";
import GitHubConnectCard from "./GitHubConnectCard";
import ProgressBar from "./ProgressBar";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  youtubeUrl: string | null;
  markdownContent: string | null;
  sectionType: string | null;
  order: number;
};

export default function LessonListClient({
  lessons,
  initialCompletedIds,
  hideProgress,
  isLocked,
  slug,
  nextCategory,
  githubUsername,
  githubStatus,
}: {
  lessons: Lesson[];
  initialCompletedIds: string[];
  hideProgress: boolean;
  isLocked?: boolean;
  slug: string;
  nextCategory: { slug: string; title: string } | null;
  githubUsername?: string | null;
  githubStatus?: string | null;
}) {
  const [completedIds, setCompletedIds] = useState(
    () => new Set(initialCompletedIds)
  );

  const onToggle = useCallback((lessonId: string, completed: boolean) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (completed) {
        next.add(lessonId);
      } else {
        next.delete(lessonId);
      }
      return next;
    });
  }, []);

  const completedCount = completedIds.size;

  return (
    <>
      {!hideProgress && !isLocked && (
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <ProgressBar completed={completedCount} total={lessons.length} />
          </div>
          <span className="text-sm text-[#c9c4bc]">
            {completedCount}/{lessons.length} completed
          </span>
        </div>
      )}

      <div className="space-y-4 mt-10">
        {lessons.map((lesson, i) => {
          if (lesson.sectionType === "github-connect") {
            return (
              <GitHubConnectCard
                key={lesson.id}
                order={lesson.order}
                index={i}
                githubUsername={githubUsername ?? null}
                githubStatus={githubStatus ?? null}
                isLocked={isLocked}
              />
            );
          }

          return (
            <LessonCard
              key={lesson.id}
              id={lesson.id}
              title={lesson.title}
              description={lesson.description}
              type={lesson.type}
              youtubeUrl={lesson.youtubeUrl}
              markdownContent={lesson.markdownContent}
              order={lesson.order}
              completed={completedIds.has(lesson.id)}
              index={i}
              hideProgress={hideProgress}
              isLocked={isLocked}
              onToggle={onToggle}
            />
          );
        })}
      </div>

      {nextCategory && (
        <div className="flex justify-end mt-8">
          <Link
            href={`/app-sprint/roadmap/${nextCategory.slug}`}
            className="inline-flex items-center gap-2 text-sm text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors"
          >
            Next: {nextCategory.title}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}
