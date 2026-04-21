export default function CommunityLoading() {
  return (
    <>
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Community
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Connect with other founders building apps.
        </p>
      </div>

      <div className="flex gap-8">
        {/* Left: Posts skeleton */}
        <div className="flex-1 min-w-0 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-black/10 bg-black/[0.02] p-5"
            >
              <div className="h-4 w-full rounded-lg bg-black/[0.04] animate-pulse mb-2" />
              <div className="h-4 w-3/4 rounded-lg bg-black/[0.04] animate-pulse mb-4" />
              <div className="h-3 w-24 rounded-lg bg-black/[0.04] animate-pulse" />
            </div>
          ))}
        </div>

        {/* Right: Sidebar skeleton */}
        <div className="hidden lg:block w-72 shrink-0 space-y-6">
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
            <div className="h-5 w-20 rounded-lg bg-black/[0.04] animate-pulse mb-3" />
            <div className="h-4 w-full rounded-lg bg-black/[0.04] animate-pulse mb-2" />
            <div className="h-4 w-2/3 rounded-lg bg-black/[0.04] animate-pulse mb-4" />
            <div className="h-10 w-full rounded-full bg-black/[0.04] animate-pulse" />
          </div>
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
            <div className="h-5 w-20 rounded-lg bg-black/[0.04] animate-pulse mb-4" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 w-14 rounded-xl bg-black/[0.04] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
