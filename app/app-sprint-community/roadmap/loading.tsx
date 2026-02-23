export default function RoadmapLoading() {
  return (
    <div className="pt-8">
      <div className="mb-12">
        <div className="h-10 w-72 rounded-lg bg-white/5 animate-pulse sm:h-12 sm:w-96" />
        <div className="mt-3 h-5 w-80 rounded-lg bg-white/5 animate-pulse" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-white/5 bg-white/5 p-6"
          >
            <div className="mb-4">
              <div className="h-8 w-8 rounded-lg bg-white/5 animate-pulse" />
            </div>
            <div className="mb-2 h-5 w-32 rounded-lg bg-white/5 animate-pulse" />
            <div className="mb-3 h-2 w-full rounded-full bg-white/10 animate-pulse" />
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-4 w-4 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
