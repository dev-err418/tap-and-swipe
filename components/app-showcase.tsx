import type { AppData } from "@/lib/app-data";
import { SiApple, SiAndroid } from "@icons-pack/react-simple-icons";
import { ArrowUpRight } from "lucide-react";

// ── Country helpers ────────────────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
  BR: "Brazil", IN: "India", CA: "Canada", AU: "Australia", JP: "Japan",
  KR: "South Korea", CN: "China", TW: "Taiwan", IT: "Italy", ES: "Spain",
  MX: "Mexico", NL: "Netherlands", SE: "Sweden", NO: "Norway", DK: "Denmark",
  FI: "Finland", PL: "Poland", TR: "Turkey", RU: "Russia", SA: "Saudi Arabia",
  AE: "UAE", SG: "Singapore", ID: "Indonesia", TH: "Thailand",
  PH: "Philippines", VN: "Vietnam", MY: "Malaysia", AR: "Argentina",
  CO: "Colombia", CL: "Chile", ZA: "South Africa", NG: "Nigeria",
  EG: "Egypt", IL: "Israel", AT: "Austria", CH: "Switzerland", BE: "Belgium",
  PT: "Portugal", IE: "Ireland", NZ: "New Zealand", CZ: "Czech Republic",
  RO: "Romania", HU: "Hungary", GR: "Greece", UA: "Ukraine", PK: "Pakistan",
  HK: "Hong Kong",
};

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function countryName(code: string): string {
  if (code === "US") return "US";
  if (code === "GB") return "UK";
  return COUNTRY_NAMES[code] || code;
}

// ── Helpers ────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

function formatCount(n: number): string {
  if (n < 1000) return n.toLocaleString();
  if (n < 1_000_000) {
    const k = n / 1000;
    return (k < 100 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k).toString()) + "K";
  }
  const m = n / 1_000_000;
  return (m < 100 ? m.toFixed(1).replace(/\.0$/, "") : Math.round(m).toString()) + "M";
}

function formatRecordedAt(value: string): string | null {
  // Accept "YYYY-MM" or "YYYY-MM-DD"
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, year, month] = match;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── Stat Card ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  children,
}: {
  label: React.ReactNode;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col rounded-lg border border-border px-4 py-3">
      <p className="flex items-center text-xs text-muted-foreground">{label}</p>
      {value ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-4xl font-bold">{value}</span>
        </div>
      ) : (
        <div className="mt-1 text-sm font-medium">{children}</div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────

export function AppShowcase({
  data,
  revenueAtRecording,
  recordedAt,
}: {
  data: AppData;
  revenueAtRecording?: string;
  recordedAt?: string;
}) {
  // iOS preferred for everything visible (icon, screenshots, rating, top countries).
  // Falls back to Android only when there is no iOS data at all.
  const primary = data.ios || data.android;
  if (!primary) return null;

  const hasIos = !!data.ios?.storeUrl;
  const hasAndroid = !!data.android?.storeUrl;
  const hasBothStores = hasIos && hasAndroid;

  const recordedAtLabel = recordedAt ? formatRecordedAt(recordedAt) : null;
  const dateSuffix = recordedAtLabel ? ` (as of ${recordedAtLabel})` : "";
  const revenueLabel = `Revenue${dateSuffix}`;

  // Combined rating across iOS + Android (weighted by review count).
  const iosRating = data.ios?.rating ?? null;
  const iosCount = data.ios?.ratingCount ?? 0;
  const androidRating = data.android?.rating ?? null;
  const androidCount = data.android?.ratingCount ?? 0;
  const totalCount = iosCount + androidCount;

  let combinedRating: number | null = null;
  if (iosRating != null && androidRating != null && totalCount > 0) {
    combinedRating =
      (iosRating * iosCount + androidRating * androidCount) / totalCount;
  } else if (iosRating != null) {
    combinedRating = iosRating;
  } else if (androidRating != null) {
    combinedRating = androidRating;
  }

  // Always show the rating tile so brand-new apps with 0 ratings still
  // render the card (value collapses to "-", label collapses to "Ratings ()").
  const showRating = true;
  const ratingValue =
    combinedRating != null && combinedRating > 0
      ? (Math.round(combinedRating * 10) / 10).toFixed(1)
      : "-";
  const hasAnyCount = iosCount > 0 || androidCount > 0;
  const ratingLabel: React.ReactNode = hasAnyCount ? (
    <>
      Ratings (
      {iosCount > 0 && (
        <>
          <SiApple size={10} color="currentColor" className="mx-0.5" /> {formatCount(iosCount)}
        </>
      )}
      {iosCount > 0 && androidCount > 0 && " + "}
      {androidCount > 0 && (
        <>
          <SiAndroid size={10} color="currentColor" className="mx-0.5" /> {formatCount(androidCount)}
        </>
      )}
      )
    </>
  ) : (
    "Ratings"
  );

  const hasStats =
    showRating ||
    !!revenueAtRecording ||
    !!primary.topCountries?.length;

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="relative p-5">
        <span className="absolute top-4 right-5 text-xs text-foreground/25">
          Updated {timeAgo(data.lastUpdated)}
        </span>
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={primary.icon}
            alt={primary.title}
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-[14px] ring-2 ring-card"
          />

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-snug">{primary.title}</h3>
            {primary.subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {primary.subtitle}
              </p>
            )}
            {(primary.price || primary.genres?.[0]) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {primary.price}
                {primary.price && primary.genres?.[0] && (
                  <span className="mx-2.5 text-muted-foreground/50">•</span>
                )}
                {primary.genres?.[0]}
              </p>
            )}
          </div>

          {/* Store links — bottom-right of the header row */}
          {(hasIos || hasAndroid) && (
            <div className="flex shrink-0 items-center gap-1.5 self-end">
              {data.ios?.storeUrl && (
                <a
                  href={data.ios.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="See on App Store"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  <SiApple size={12} color="currentColor" />
                  <span className="hidden sm:inline">App Store</span>
                  <ArrowUpRight size={12} />
                </a>
              )}
              {data.android?.storeUrl && (
                <a
                  href={data.android.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="See on Google Play"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  <SiAndroid size={12} color="currentColor" />
                  <span className="hidden sm:inline">Google Play</span>
                  <ArrowUpRight size={12} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stat cards (iOS data) */}
      {hasStats && (
        <div className="flex items-stretch gap-3 overflow-x-auto px-5 pb-4 scrollbar-none">
          {showRating && (
            <StatCard label={ratingLabel} value={ratingValue} />
          )}
          {revenueAtRecording && (
            <StatCard label={revenueLabel} value={revenueAtRecording} />
          )}
          {primary.topCountries && primary.topCountries.length > 0 && (
            <StatCard label="Top countries">
              <div className="flex flex-col gap-0.5">
                {primary.topCountries.map((c) => (
                  <span key={c}>{countryFlag(c)} {countryName(c)}</span>
                ))}
              </div>
            </StatCard>
          )}
        </div>
      )}

      {/* Screenshots (iOS) */}
      {primary.screenshots.length > 0 && (
        <div className="flex gap-3 overflow-x-auto px-5 pb-5 scrollbar-none">
          {primary.screenshots.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`Screenshot ${i + 1}`}
              width={280}
              height={560}
              className="h-[280px] w-auto shrink-0 rounded-lg"
            />
          ))}
        </div>
      )}
    </div>
  );
}
