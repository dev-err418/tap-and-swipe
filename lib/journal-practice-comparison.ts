import { analyzeExperiment, type ExperimentAnalysis } from "./experiment-stats";
import type { JournalPracticeReport } from "./journal-practice-analytics";

/** Feed the shared comparison UI real mature-user measurements, never installs or revenue proxies. */
export function journalPracticeComparisons(report: JournalPracticeReport): { title: string; analysis: ExperimentAnalysis }[] {
  if (report.status === "unavailable") return [];
  const comparisons = (["d1", "d7"] as const).map((day) => {
    const title = `${day.toUpperCase()} return`;
    return { title, analysis: analyzeExperiment(report.rows.map((row) => ({
      key: row.variant, label: row.label, exposures: row[day].eligible,
      conversions: row[day].retained, revenue: 0,
    })), "conversion_rate", title, { decisiveProbability: 0 }) };
  });
  const title = "Sessions / user / day";
  comparisons.push({ title, analysis: analyzeExperiment(report.rows.map((row) => ({
    key: row.variant, label: row.label, exposures: row.sessionUsersD7,
    // All enrolled users have a session on day zero; the sample is the user, not the session.
    conversions: row.sessionUsersD7, revenue: row.sessionsD7 / 7,
    variance: row.sessionsPerUserDayVarianceD7 ?? 0,
  })), "revenue_per_visitor", title, { decisiveProbability: 0 }) });

  return comparisons.map(({ title, analysis }) => {
    if (report.warnings.length === 0 && analysis.sufficientData) return { title, analysis };
    // Do not show a 100% winner when the other arm is absent or still immature.
    return { title, analysis: { ...analysis,
      variants: analysis.variants.map((variant) => ({ ...variant,
        chanceToWin: null, chanceToBeatControl: null, relativeDelta: null,
        credibleInterval: null, isSignificant: false, status: "insufficient_data" as const,
      })),
      readiness: report.warnings.length ? { ...analysis.readiness,
        status: "unavailable" as const, required: null, remaining: null, progress: null,
        reason: "Activity records need review before comparing variants.",
      } : analysis.readiness,
    } };
  });
}
