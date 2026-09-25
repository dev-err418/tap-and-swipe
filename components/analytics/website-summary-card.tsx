import Link from "next/link";
import { DASHBOARD_SURFACE_CLASS } from "@/components/analytics/dashboard-surface";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";
type WebsiteSite = "appsprint" | "postback" | "grewit" | "community";

export type WebsiteTrendPoint = {
  bucket: Date;
  visitors: number;
  revenue: number;
};

export function WebsiteSummaryCard({
  period,
  site,
  domain,
  metrics,
  trend,
  activeTests,
}: {
  period: Period;
  site: WebsiteSite;
  domain: string;
  metrics: { visitors: number; revenue_cents: number };
  trend: WebsiteTrendPoint[];
  activeTests: number;
}) {
  return (
    <Link
      href={analyticsHref({ period, site })}
      className={`relative block cursor-pointer overflow-hidden p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40 ${DASHBOARD_SURFACE_CLASS}`}
    >
      <div className="pointer-events-none select-none">
        <ProjectExperimentBadge count={activeTests} />
        <div className="flex items-center gap-3 pr-8">
          <WebsiteFavicon domain={domain} size="small" />
          <h2 className="truncate text-xl font-semibold tracking-tight">{domain}</h2>
        </div>
        <WebsiteMiniChart points={trend} />
        <p className="text-base text-black/55">
          <strong className="font-bold text-black">{formatCompactNumber(metrics.visitors)}</strong>{" "}
          visitors
          <span className="mx-2 text-black/35">•</span>
          <strong className="font-bold text-black">{formatCompactRevenue(metrics.revenue_cents)}</strong>{" "}
          revenue
        </p>
      </div>
    </Link>
  );
}

export function ProjectExperimentBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = `${count} A/B ${count === 1 ? "test" : "tests"} running`;
  return (
    <span
      aria-label={label}
      title={label}
      className="absolute top-4 right-4 inline-flex size-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold leading-none tabular-nums text-white shadow-sm ring-2 ring-white"
    >
      {count}
    </span>
  );
}

const VISITOR_CHART_COLOR = "#1d4ed8";
const POSTBACK_ORANGE = "#f97316";

export function WebsiteMiniChart({
  points,
  ariaLabel = "Visitor trend line and revenue bars",
}: {
  points: WebsiteTrendPoint[];
  ariaLabel?: string;
}) {
  const width = 520;
  const height = 150;
  const left = 8;
  const right = width - 8;
  const top = 14;
  const bottom = height - 10;
  const chartHeight = bottom - top;
  const values = points.length > 0 ? points : [{ bucket: new Date(0), visitors: 0, revenue: 0 }];
  const maxVisitors = Math.max(...values.map((point) => point.visitors));
  const minVisitors = Math.min(...values.map((point) => point.visitors));
  const maxRevenue = Math.max(...values.map((point) => point.revenue), 1);
  const spacing = values.length > 1 ? (right - left) / (values.length - 1) : right - left;
  const coordinates = values.map((point, index) => ({
    x: values.length > 1 ? left + index * spacing : width / 2,
    y:
      maxVisitors === minVisitors
        ? top + chartHeight * 0.42
        : top + ((maxVisitors - point.visitors) / (maxVisitors - minVisitors)) * chartHeight * 0.72,
  }));
  const linePath = buildSmoothLinePath(coordinates, left, right);
  const barWidth = Math.min(22, Math.max(6, spacing * 0.78));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none my-3 h-32 w-full overflow-visible"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="postback-orange-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`color-mix(in oklch, ${POSTBACK_ORANGE}, white 15%)`} />
          <stop offset="1" stopColor={POSTBACK_ORANGE} />
        </linearGradient>
        <filter id="postback-orange-shadow" x="-30%" y="-15%" width="160%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.08" />
        </filter>
      </defs>
      {values.map((point, index) => {
        if (point.revenue <= 0) return null;
        const barHeight = Math.max(7, (point.revenue / maxRevenue) * chartHeight * 0.62);
        const x = values.length > 1 ? left + index * spacing : width / 2;
        return (
          <g key={`${point.bucket.toISOString()}-conversion`} filter="url(#postback-orange-shadow)">
            <rect
              x={x - barWidth / 2}
              y={bottom - barHeight}
              width={barWidth}
              height={barHeight}
              rx="4"
              fill="url(#postback-orange-glass)"
              stroke={`color-mix(in oklch, ${POSTBACK_ORANGE}, black 10%)`}
              strokeWidth="1"
            />
            <path
              d={`M ${x - barWidth / 2 + 4} ${bottom - barHeight + 1.5} H ${x + barWidth / 2 - 4}`}
              fill="none"
              stroke={`color-mix(in oklch, ${POSTBACK_ORANGE}, white 30%)`}
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <path
        d={linePath}
        fill="none"
        stroke={VISITOR_CHART_COLOR}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildSmoothLinePath(points: { x: number; y: number }[], left: number, right: number) {
  if (points.length === 1) return `M ${left},${points[0].y} L ${right},${points[0].y}`;
  let path = `M ${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`;
  }
  return path;
}

export function WebsiteFavicon({ domain, size }: { domain: string; size: "small" | "large" }) {
  const isPostback = domain === "postback.sh";
  const sizeClass = size === "small" ? "size-6 rounded-md" : "size-10 rounded-[10px]";
  const imageSize = size === "small" ? 24 : 40;
  if (isPostback) {
    return (
      <span className={`flex shrink-0 items-center justify-center bg-black ${sizeClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={websiteFaviconUrl(domain)} alt="" width={imageSize} height={imageSize} className="size-full invert" />
      </span>
    );
  }
  if (domain === "community") {
    return (
      <span className={`block shrink-0 overflow-hidden ${sizeClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={websiteFaviconUrl(domain)} alt="" width={imageSize} height={imageSize} className="size-full invert" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={websiteFaviconUrl(domain)} alt="" width={imageSize} height={imageSize} className={`shrink-0 ${sizeClass}`} />
  );
}

function websiteFaviconUrl(domain: string) {
  if (domain === "appsprint.app") return "https://appsprint.app/app-icon.png";
  if (domain === "postback.sh") return "https://postback.sh/icon.png";
  if (domain === "grewit.app") return "/icons/grewit.png";
  return "/icon.png";
}

function analyticsHref({ period, site, app }: { period: Period; site?: WebsiteSite; app?: "glow" | "poky" | "versy" }) {
  const params = new URLSearchParams();
  if (period !== "week") params.set("period", period);
  if (site) params.set("site", site);
  if (app) params.set("app", app);
  const query = params.toString();
  return `/analytics${query ? `?${query}` : ""}`;
}

export function formatCompactNumber(value: number | bigint) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number(value))
    .replace("K", "k");
}

export function formatCompactRevenue(cents: number) {
  return `$${formatCompactNumber(cents / 100)}`;
}
