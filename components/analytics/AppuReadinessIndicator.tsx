"use client";

import { useMemo } from "react";
import { appuComparisonReadiness } from "@/lib/arpu-comparison";
import type { JourneyVersionCohort } from "@/lib/user-journey";
import { ReadinessIndicator } from "./ExperimentStats";

export function AppuReadinessIndicator({ cohorts }: { cohorts: JourneyVersionCohort[] }) {
  const readiness = useMemo(() => appuComparisonReadiness(cohorts.map((row) => ({
    key: row.version, metric: row.conversions?.global,
  }))), [cohorts]);
  return <ReadinessIndicator readiness={readiness} />;
}
