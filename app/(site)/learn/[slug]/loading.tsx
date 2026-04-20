export default function CategoryLoading() {
  return (
    <div className="pt-8">
      <div className="mb-8 h-4 w-32 rounded-lg bg-black/[0.04] animate-pulse" />

      <div className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-10 w-10 rounded-lg bg-black/[0.04] animate-pulse" />
          <div className="h-8 w-48 rounded-lg bg-black/[0.04] animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs h-6 rounded-full bg-black/10 animate-pulse" />
          <div className="h-4 w-24 rounded-lg bg-black/[0.04] animate-pulse" />
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-black/10 bg-black/[0.02] p-5"
          >
            <div className="flex items-center gap-4">
              <div className="h-6 w-6 rounded-full bg-black/[0.04] animate-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-5 w-48 rounded-lg bg-black/[0.04] animate-pulse mb-1" />
                <div className="h-3.5 w-64 rounded-lg bg-black/[0.04] animate-pulse" />
              </div>
              <div className="h-8 w-20 rounded-full bg-black/[0.04] animate-pulse shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
