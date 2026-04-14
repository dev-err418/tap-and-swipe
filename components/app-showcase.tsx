import type { AppData, PlatformData } from "@/lib/app-data";

function StarRating({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating * 10) / 10;
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="text-amber-500">★</span>
      <span>{rounded}</span>
      <span className="text-foreground/30">·</span>
      <span>{count.toLocaleString()} ratings</span>
    </span>
  );
}

function PlatformBadge({
  platform,
  url,
}: {
  platform: "ios" | "android";
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      {platform === "ios" ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          App Store
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.18 23.04c.17.3.44.56.78.56.12 0 .25-.03.37-.09l2.6-1.42c1.18.52 2.48.81 3.84.81s2.66-.29 3.84-.81l2.6 1.42c.12.06.25.09.37.09.34 0 .61-.26.78-.56.53-.93-.07-1.86-.66-2.46l-.64-.56c1.46-1.62 2.35-3.76 2.35-6.12 0-5.04-4.03-9.12-9-9.12S1.77 8.86 1.77 13.9c0 2.36.89 4.5 2.35 6.12l-.64.56c-.59.6-1.19 1.53-.66 2.46h.36zM10.77 6.5c3.87 0 7 2.92 7 6.52s-3.13 6.52-7 6.52-7-2.92-7-6.52 3.13-6.52 7-6.52z" />
          </svg>
          Google Play
        </>
      )}
    </a>
  );
}

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

export function AppShowcase({
  data,
  downloadsEstimate,
  revenueEstimate,
}: {
  data: AppData;
  downloadsEstimate?: string;
  revenueEstimate?: string;
}) {
  // Pick primary platform data (prefer iOS, fall back to Android)
  const primary: PlatformData | undefined = data.ios || data.android;
  if (!primary) return null;

  const secondary: PlatformData | undefined = data.ios ? data.android : undefined;

  // Use iOS screenshots by default, fall back to Android
  const screenshots = data.ios?.screenshots?.length
    ? data.ios.screenshots
    : data.android?.screenshots || [];

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={primary.icon}
            alt={primary.title}
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-[14px]"
          />
          <div className="min-w-0">
            <h3 className="font-semibold leading-snug">{primary.title}</h3>
            {primary.subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                {primary.subtitle}
              </p>
            )}
            {!primary.subtitle && primary.genre && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {primary.genre}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {primary.rating != null && primary.ratingCount != null && (
                <StarRating
                  rating={primary.rating}
                  count={primary.ratingCount}
                />
              )}
              {primary.price && (
                <span className="text-sm text-muted-foreground">
                  {primary.price}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Platform badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {data.ios?.storeUrl && (
            <PlatformBadge platform="ios" url={data.ios.storeUrl} />
          )}
          {data.android?.storeUrl && (
            <PlatformBadge platform="android" url={data.android.storeUrl} />
          )}
        </div>
      </div>

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <div className="flex gap-3 overflow-x-auto px-5 pb-5 scrollbar-none">
          {screenshots.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`Screenshot ${i + 1}`}
              className="h-[280px] w-auto shrink-0 rounded-lg"
            />
          ))}
        </div>
      )}

      {/* Metrics + last updated */}
      {(downloadsEstimate || revenueEstimate || data.lastUpdated) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border px-5 py-3 text-sm text-muted-foreground">
          {downloadsEstimate && <span>📥 {downloadsEstimate} downloads</span>}
          {revenueEstimate && <span>💰 {revenueEstimate}/mo revenue</span>}
          {(secondary?.rating != null && secondary.ratingCount != null) && (
            <span className="flex items-center gap-1">
              <span className="text-amber-500">★</span>
              {Math.round(secondary.rating * 10) / 10} on{" "}
              {data.ios && data.android
                ? "Google Play"
                : "App Store"}
            </span>
          )}
          <span className="ml-auto text-xs text-foreground/25">
            Updated {timeAgo(data.lastUpdated)}
          </span>
        </div>
      )}
    </div>
  );
}
