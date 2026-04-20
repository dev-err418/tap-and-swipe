export default function CategoryLoading() {
  return (
    <div className="pt-8">
      {/* Back link */}
      <div className="mb-8 h-4 w-32 rounded-lg bg-black/[0.04] animate-pulse" />

      <div className="flex gap-8">
        {/* Left: TOC sidebar */}
        <div className="w-72 shrink-0 hidden lg:block">
          <div className="h-6 w-40 rounded-lg bg-black/[0.04] animate-pulse mb-2" />
          <div className="h-4 w-52 rounded-lg bg-black/[0.04] animate-pulse mb-4" />
          <div className="h-6 w-full rounded-full bg-black/10 animate-pulse mb-4" />

          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                <div className="h-4 w-4 rounded-full bg-black/[0.04] animate-pulse shrink-0" />
                <div
                  className="h-4 rounded-lg bg-black/[0.04] animate-pulse"
                  style={{ width: `${60 + (i * 13) % 40}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-black/10 shrink-0" />

        {/* Right: Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="h-8 w-64 rounded-lg bg-black/[0.04] animate-pulse mb-2" />
              <div className="h-4 w-80 rounded-lg bg-black/[0.04] animate-pulse" />
            </div>
            <div className="h-10 w-36 rounded-full bg-black/[0.04] animate-pulse shrink-0" />
          </div>
          <div className="aspect-video w-full rounded-xl bg-black/[0.04] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
