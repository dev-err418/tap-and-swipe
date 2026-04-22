export default function AnalyticsLoading() {
  return (
    <>
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Analytics</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Traffic sources for coaching and community.
          </p>
        </div>
        <div className="h-10 w-72 rounded-xl bg-black/5 animate-pulse" />
      </div>

      <div className="mb-10">
        <div className="mb-4 h-6 w-48 rounded-lg bg-black/[0.06] animate-pulse" />
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="flex items-stretch gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex h-[88px] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-4"
              >
                <div className="h-3 w-20 rounded bg-black/[0.06] animate-pulse" />
                <div className="h-7 w-16 rounded bg-black/[0.06] animate-pulse" />
              </div>
            ))}
            <div className="flex w-8 items-center justify-center">
              <div className="h-16 w-8 rounded bg-black/[0.04] animate-pulse" />
            </div>
            <div className="flex w-44 flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-2"
                >
                  <div className="h-3 w-20 rounded bg-black/[0.06] animate-pulse" />
                  <div className="h-5 w-10 rounded bg-black/[0.06] animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {Array.from({ length: 3 }).map((_, blk) => (
          <div key={blk}>
            <div className="mb-4">
              <div className="h-6 w-48 rounded-lg bg-black/[0.06] animate-pulse" />
              <div className="mt-2 h-4 w-32 rounded-lg bg-black/[0.04] animate-pulse" />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, t) => (
                <div key={t} className="rounded-2xl border border-black/10 bg-white p-5">
                  <div className="mb-3 h-4 w-36 rounded bg-black/[0.06] animate-pulse" />
                  {Array.from({ length: 6 }).map((_, r) => (
                    <div key={r} className="flex items-center justify-between border-b border-black/5 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-black/[0.06] animate-pulse" />
                        <div className="h-4 w-28 rounded bg-black/[0.06] animate-pulse" />
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="h-4 w-8 rounded bg-black/[0.06] animate-pulse" />
                        <div className="h-4 w-8 rounded bg-black/[0.06] animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
