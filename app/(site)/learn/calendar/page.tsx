export default function CalendarPage() {
  return (
    <>
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Calendar
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Upcoming live calls and events.
        </p>
      </div>

      <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-black/[0.02] py-24">
        <p className="text-black/30 text-sm">Coming soon</p>
      </div>
    </>
  );
}
