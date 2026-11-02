"use client";

import { use } from "react";
import type { MobileAppCountryRow } from "@/lib/mobile-app-analytics";
import AppCountryBreakdown from "./AppCountryBreakdown";
import AppConversionBreakdown from "./AppConversionBreakdown";

export type CountryBreakdownData = { countries: MobileAppCountryRow[]; available: boolean; windowLabel: string };

/** This lower-page comparison must not delay the selected period's chart. */
export default function DeferredCountryBreakdown({ report, country }: {
  report: Promise<CountryBreakdownData>; country: string;
}) {
  const data = use(report);
  const countries = data.countries.filter((row) => country === "all" || row.country === country);
  return <div className="grid min-w-0 gap-4 xl:grid-cols-2">
    <AppCountryBreakdown countries={countries} windowLabel={data.windowLabel} available={data.available} />
    <AppConversionBreakdown countries={countries} conversion="paid" windowLabel={data.windowLabel} available={data.available} />
  </div>;
}
