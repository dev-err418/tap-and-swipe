import { activeABTestCount } from "@/lib/app-experiment-map";
import { DASHBOARD_SURFACE_CLASS } from "@/components/analytics/dashboard-surface";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";

const PERIOD_SUMMARY: Record<Period, string> = {
  day: "today",
  yesterday: "yesterday",
  "3days": "in the last 3 days",
  week: "last week",
  month: "last month",
  all: "across all time",
};

const APPS = [
  {
    id: "poky",
    name: "Poky",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/5e/46/3f/5e463fde-45e6-7fdc-ce5a-bb5b73af405d/AppIcon-0-0-1x_U007ephone-0-1-sRGB-85-220.png/512x512bb.jpg",
  },
  {
    id: "glow",
    name: "Glow",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/19/20/0e/19200e98-f11f-8ab4-850a-81a2a45122e0/AppIcon-0-0-1x_U007ephone-0-1-0-sRGB-85-220.png/512x512bb.jpg",
  },
  {
    id: "versy",
    name: "Versy",
    iconUrl: "/community-icons/versy.png",
  },
] as const;

const WEBSITES = [
  { domain: "appsprint.app", iconUrl: "https://appsprint.app/app-icon.png", invert: false },
  { domain: "community", iconUrl: "/icon.png", invert: true },
] as const;

export function analyticsPeriodSummary(period: string) {
  return period in PERIOD_SUMMARY ? PERIOD_SUMMARY[period as Period] : PERIOD_SUMMARY.week;
}

export function AnalyticsDirectorySkeleton({ periodLabel }: { periodLabel: string }) {
  return (
    <div className="space-y-12">
      <AppDirectorySkeleton periodLabel={periodLabel} />
      <WebsiteDirectorySkeleton periodLabel={periodLabel} />
    </div>
  );
}

export function AppTotalsSkeleton({ periodLabel }: { periodLabel: string }) {
  return (
    <p className="min-w-0 text-lg text-black/55 sm:text-xl">
      Hey Arthur, you got <MetricBone /> downloads and <MetricBone /> proceeds {periodLabel}.
    </p>
  );
}

export function WebsiteTotalsSkeleton({ periodLabel }: { periodLabel: string }) {
  return (
    <p className="min-w-0 text-lg text-black/55 sm:text-xl">
      Hey Arthur, you got <MetricBone /> visitors and made <MetricBone /> {periodLabel}.
    </p>
  );
}

export function AppCardSkeleton({ id }: { id: "poky" | "glow" | "versy" }) {
  const app = APPS.find((item) => item.id === id)!;
  return (
    <DirectoryCardSkeleton
      title={app.name}
      iconUrl={app.iconUrl}
      tests={activeABTestCount(app.id)}
      metric="app"
    />
  );
}

export function WebsiteCardSkeleton({ domain }: { domain: "appsprint.app" | "community" }) {
  const site = WEBSITES.find((item) => item.domain === domain)!;
  return (
    <DirectoryCardSkeleton
      title={site.domain}
      iconUrl={site.iconUrl}
      invert={site.invert}
      metric="website"
    />
  );
}

export function AppDirectorySkeleton({ periodLabel }: { periodLabel: string }) {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading apps">
      <AppTotalsSkeleton periodLabel={periodLabel} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {APPS.map((app) => (
          <DirectoryCardSkeleton
            key={app.name}
            title={app.name}
            iconUrl={app.iconUrl}
            tests={activeABTestCount(app.id)}
            metric="app"
          />
        ))}
      </div>
    </section>
  );
}

export function WebsiteDirectorySkeleton({ periodLabel }: { periodLabel: string }) {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading websites">
      <WebsiteTotalsSkeleton periodLabel={periodLabel} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {WEBSITES.map((site) => (
          <DirectoryCardSkeleton
            key={site.domain}
            title={site.domain}
            iconUrl={site.iconUrl}
            invert={site.invert}
            metric="website"
          />
        ))}
      </div>
    </section>
  );
}

function DirectoryCardSkeleton({
  title,
  iconUrl,
  invert = false,
  tests = 0,
  metric,
}: {
  title: string;
  iconUrl: string;
  invert?: boolean;
  tests?: number;
  metric: "app" | "website";
}) {
  const testLabel = tests > 0 ? `${tests} A/B ${tests === 1 ? "test" : "tests"} running` : null;
  return (
    <div className={`relative overflow-hidden p-6 ${DASHBOARD_SURFACE_CLASS}`}>
      {testLabel ? (
        <span
          aria-label={testLabel}
          className="absolute top-4 right-4 inline-flex size-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold leading-none tabular-nums text-white shadow-sm ring-2 ring-white"
        >
          {tests}
        </span>
      ) : null}
      <div className="flex items-center gap-3 pr-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl}
          alt=""
          width={24}
          height={24}
          className={`size-6 shrink-0 rounded-md ${invert ? "invert" : ""}`}
        />
        <h2 className="truncate text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div aria-hidden className="my-3 h-32 rounded-xl bg-black/[0.04] motion-safe:animate-pulse" />
      <p className="text-base text-black/55">
        {metric === "app" ? (
          <>
            <MetricBone /> proceeds
            <span className="mx-2 text-black/35">•</span>
            <MetricBone /> APPU
          </>
        ) : (
          <>
            <MetricBone /> visitors
            <span className="mx-2 text-black/35">•</span>
            <MetricBone /> revenue
          </>
        )}
      </p>
    </div>
  );
}

function MetricBone() {
  return (
    <span
      aria-hidden
      className="inline-block h-[1.05em] w-14 translate-y-[0.12em] rounded bg-black/10 align-middle motion-safe:animate-pulse"
    />
  );
}
