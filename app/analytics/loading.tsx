"use client";

import { useSearchParams } from "next/navigation";

const emptyCard = "motion-safe:animate-pulse rounded-[28px] bg-white";

function DirectorySkeleton() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="h-10" aria-hidden />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className={`${emptyCard} h-[252px]`} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="h-7" aria-hidden />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className={`${emptyCard} h-[252px]`} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-10">
      <div className="h-[148px] sm:h-[92px]" aria-hidden />

      <section className="space-y-4">
        <div className={`${emptyCard} h-[473px]`} />
        <div className="h-[30px]" aria-hidden />
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`${emptyCard} h-[438px]`} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AnalyticsLoading() {
  const searchParams = useSearchParams();
  const isDetail = Boolean(searchParams.get("app") || searchParams.get("site"));

  return (
    <main
      className="min-h-screen px-4 py-6 text-black sm:px-6 sm:py-8"
      aria-busy="true"
      aria-label="Loading analytics"
    >
      <div className="mx-auto max-w-6xl">
        {isDetail ? <DetailSkeleton /> : <DirectorySkeleton />}
      </div>
    </main>
  );
}
