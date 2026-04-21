export default function ClassroomLoading() {
  return (
    <>
      <div className="mb-12">
        <div className="h-10 w-72 rounded-lg bg-black/[0.04] animate-pulse sm:h-12 sm:w-96" />
        <div className="mt-3 h-5 w-80 rounded-lg bg-black/[0.04] animate-pulse" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02]"
          >
            <div className="aspect-video w-full bg-black/[0.04] animate-pulse" />
            <div className="p-4">
              <div className="mb-2 h-5 w-32 rounded-lg bg-black/[0.04] animate-pulse" />
              <div className="mb-3 h-4 w-48 rounded-lg bg-black/[0.04] animate-pulse" />
              <div className="h-6 w-full rounded-full bg-black/10 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
