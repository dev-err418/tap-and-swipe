"use client";

import { useSearchParams } from "next/navigation";

const pulse = "motion-safe:animate-pulse rounded-full bg-black/[0.07]";

function Line({ className }: { className: string }) {
  return <div className={`${pulse} ${className}`} />;
}

function ChartSkeleton({ compact = false }: { compact?: boolean }) {
  const heights = compact
    ? [38, 52, 44, 70, 56, 82, 64, 76, 58, 88, 72, 92]
    : [42, 55, 48, 66, 58, 74, 62, 81, 69, 86, 76, 92, 84, 96];

  return (
    <div
      className={`flex items-end gap-2 border-b border-black/[0.06] px-1 ${compact ? "h-28" : "h-52"}`}
      aria-hidden="true"
    >
      {heights.map((height, index) => (
        <div
          key={index}
          className="motion-safe:animate-pulse flex-1 rounded-t-md bg-black/[0.055]"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-[28px] bg-white p-6">
      <div className="flex items-center gap-3">
        <div className={`${pulse} size-10 shrink-0 rounded-xl`} />
        <div className="space-y-2">
          <Line className="h-5 w-24" />
          <Line className="h-3 w-16" />
        </div>
      </div>
      <div className="mt-6">
        <ChartSkeleton compact />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-black/[0.06] pt-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Line className="h-3 w-14 max-w-full" />
            <Line className="h-5 w-16 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeadingSkeleton({ showPeriod = false }: { showPeriod?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        <Line className="h-5 w-28" />
        <Line className="h-5 w-44" />
        <Line className="h-5 w-32" />
      </div>
      {showPeriod ? <div className={`${pulse} h-10 w-32 shrink-0`} /> : null}
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <SectionHeadingSkeleton showPeriod />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeadingSkeleton />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="space-y-3">
      <Line className="h-3 w-20" />
      <Line className="h-8 w-24" />
      <Line className="h-3 w-28 max-w-full" />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className={`${pulse} h-9 w-24`} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`${pulse} size-10 shrink-0 rounded-xl`} />
          <div className="space-y-2">
            <Line className="h-6 w-52 max-w-[55vw]" />
            <Line className="h-3 w-28" />
          </div>
        </div>
        <div className={`${pulse} h-10 w-32 shrink-0`} />
      </div>

      <section className="rounded-[28px] bg-white p-6 sm:p-8">
        <div className="grid gap-7 border-b border-black/[0.06] pb-7 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricSkeleton key={index} />
          ))}
        </div>
        <div className="pt-7">
          <div className="mb-5 flex items-center justify-between">
            <Line className="h-4 w-36" />
            <Line className="h-4 w-20" />
          </div>
          <ChartSkeleton />
        </div>
      </section>

      <div className="mx-auto flex w-fit gap-2 rounded-full bg-white p-1.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={`${pulse} h-8 w-24`} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, cardIndex) => (
          <section key={cardIndex} className="rounded-[28px] bg-white p-6 sm:p-8">
            <div className="mb-7 flex items-center justify-between">
              <div className="space-y-2">
                <Line className="h-5 w-32" />
                <Line className="h-3 w-44" />
              </div>
              <Line className="h-7 w-16" />
            </div>
            <ChartSkeleton compact />
          </section>
        ))}
      </div>
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
