export default function CommunityLoading() {
  return (
    <>
      <div className="mb-12">
        <div className="h-10 w-56 rounded-lg bg-black/[0.04] animate-pulse sm:h-12" />
        <div className="mt-3 h-5 w-72 rounded-lg bg-black/[0.04] animate-pulse" />
      </div>

      <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-black/[0.02] py-24">
        <div className="h-4 w-28 rounded-lg bg-black/[0.04] animate-pulse" />
      </div>
    </>
  );
}
