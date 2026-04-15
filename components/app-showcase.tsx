"use client";

import { useState } from "react";
import type { AppData, PlatformData } from "@/lib/app-data";
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

// ── Stat Card ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  estimate,
  children,
}: {
  label: string;
  value?: string;
  estimate?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col rounded-lg border border-border px-4 py-3">
      <p key={label} className="animate-fade-in text-xs text-muted-foreground">{label}</p>
      {estimate && (
        <span className="group absolute -top-0.5 right-2">
          <span className="cursor-help text-[11px] text-muted-foreground/50">
            ?
          </span>
          <span className="pointer-events-none absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            This is an estimate and may not reflect exact figures. Use as an indicator only.
          </span>
        </span>
      )}
      {value ? (
        <div className="flex flex-1 items-center justify-center">
          <span key={value} className="animate-fade-in text-4xl font-bold">{value}</span>
        </div>
      ) : (
        <div key={String(children)} className="mt-1 animate-fade-in text-sm font-medium">{children}</div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────

type Platform = "ios" | "android";

export function AppShowcase({ data }: { data: AppData }) {
  const hasIos = !!data.ios;
  const hasAndroid = !!data.android;
  const hasBoth = hasIos && hasAndroid;
  const defaultPlatform: Platform = hasIos ? "ios" : "android";

  const [activePlatform, setActivePlatform] = useState<Platform>(defaultPlatform);

  const primary = data.ios || data.android;
  if (!primary) return null;

  const active: PlatformData = (activePlatform === "ios" ? data.ios : data.android) || primary;

  const hasStats =
    active.rating != null ||
    active.downloadsEstimate ||
    active.revenueEstimate ||
    active.topCountries?.length;

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="relative p-5">
        <span className="absolute top-4 right-5 text-xs text-foreground/25">
          Updated {timeAgo(data.lastUpdated)}
        </span>
        <div className="flex items-start gap-4">
          {/* App icons */}
          <div className="flex shrink-0 items-end -space-x-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primary.icon}
              alt={primary.title}
              width={64}
              height={64}
              className="h-16 w-16 rounded-[14px] ring-2 ring-card"
            />
            {hasBoth && data.android && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.android.icon}
                alt={`${data.android.title} (Android)`}
                width={36}
                height={36}
                className="h-9 w-9 rounded-[8px] ring-2 ring-card"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold leading-snug">{primary.title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {primary.genres?.[0] || primary.subtitle}
            </p>
            {primary.price && (
              <p className="mt-1 text-sm text-muted-foreground">{primary.price}</p>
            )}
          </div>
        </div>

        {/* Store link + platform toggle */}
        <div className="mt-4 flex items-center justify-between">
          {/* "See on ..." link — follows active platform */}
          {active.storeUrl && (
            <a
              href={active.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              See on {activePlatform === "ios" ? "App Store" : "Google Play"}
              <ArrowUpRight size={14} />
            </a>
          )}
          {hasBoth && (
            <div className="flex rounded-lg border border-border p-0.5">
              <button
                onClick={() => setActivePlatform("ios")}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activePlatform === "ios"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <SiApple size={12} color="currentColor" /> iOS
              </button>
              <button
                onClick={() => setActivePlatform("android")}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activePlatform === "android"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <SiAndroid size={12} color="currentColor" /> Android
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards — react to platform toggle */}
      {hasStats && (
        <div className="flex items-stretch gap-3 overflow-x-auto px-5 pb-4 scrollbar-none">
          {active.rating != null && active.ratingCount != null && (
            <StatCard
              label={`Rating (${active.ratingCount.toLocaleString()})`}
              value={(Math.round(active.rating * 10) / 10).toFixed(1)}
            />
          )}
          {active.downloadsEstimate && (
            <StatCard label="Downloads / mo" value={active.downloadsEstimate} estimate />
          )}
          {active.revenueEstimate && (
            <StatCard label="Revenue / mo" value={active.revenueEstimate} estimate />
          )}
          {active.topCountries && active.topCountries.length > 0 && (
            <StatCard label="Top countries">
              <div className="flex flex-col gap-0.5">
                {active.topCountries.map((c) => (
                  <span key={c}>{countryFlag(c)} {countryName(c)}</span>
                ))}
              </div>
            </StatCard>
          )}
        </div>
      )}

      {/* Screenshots — based on active platform */}
      {active.screenshots.length > 0 && (
        <div className="flex gap-3 overflow-x-auto px-5 pb-5 scrollbar-none">
          {active.screenshots.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${activePlatform}-${i}`}
              src={src}
              alt={`${activePlatform === "ios" ? "iOS" : "Android"} screenshot ${i + 1}`}
              className="h-[280px] w-auto shrink-0 rounded-lg"
            />
          ))}
        </div>
      )}
    </div>
  );
}
