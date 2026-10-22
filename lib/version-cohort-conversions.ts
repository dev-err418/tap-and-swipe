import type { buildAppOverviewCohorts } from "./app-overview-cohorts";
import { isMobileMoneyEvent } from "./mobile-app-money";
import { journeyVersion } from "./user-journey";

export const ACQUISITION_ATTRIBUTE_KEYS = ["acquisition_source", "apple_search_ads_attribution"] as const;

export type AcquisitionGroup = "metaAds" | "asa" | "nonAds";
export type VersionConversionMetric = { installs: number; trials: number; finishedTrials: number; paid: number; installPaid: number; purchases: number; refunds: number; proceeds: number; proceedsVariance: number | null; missingProceeds: boolean; missingInstallMoney: boolean; missingMoney: boolean };
export type VersionConversions = Record<"global" | "ads" | AcquisitionGroup, VersionConversionMetric>;
type Outcome = Parameters<typeof buildAppOverviewCohorts>[0]["events"][number];
type Install = { appUserId: string; appVersion: string; installedAt: number };

export function emptyVersionConversions(): VersionConversions {
  const metric = (): VersionConversionMetric => ({ installs: 0, trials: 0, finishedTrials: 0, paid: 0, installPaid: 0, purchases: 0, refunds: 0, proceeds: 0, proceedsVariance: null, missingProceeds: false, missingInstallMoney: false, missingMoney: false });
  return { global: metric(), ads: metric(), metaAds: metric(), asa: metric(), nonAds: metric() };
}

export function acquisitionGroup(attributes: Record<string, string> | undefined): AcquisitionGroup {
  const source = attributes?.acquisition_source?.trim().toLowerCase();
  // Prefer the explicit Meta source if both attribution signals are present.
  if (source === "meta") return "metaAds";
  if (attributes?.apple_search_ads_attribution?.trim().toLowerCase() === "true") return "asa";
  // Displayed as Organic: no recorded ad attribution, not verified organic.
  return "nonAds";
}

/** Trial conversion uses installs; paid conversion uses first trials whose recorded end has passed. */
export function versionCohortConversions(installs: Install[], events: Outcome[], attributes: Map<string, Record<string, string>>,
  startMs: number, endMs: number, asOf = Date.now(), outcomesStart?: Map<string, number>): Map<string, VersionConversions> {
  const first = new Map<string, Install>();
  for (const install of installs) {
    const previous = first.get(install.appUserId);
    if (install.appUserId && Number.isFinite(install.installedAt) && (!previous || install.installedAt < previous.installedAt)) first.set(install.appUserId, install);
  }
  const selected = new Map([...first].filter(([, install]) => install.installedAt >= startMs && install.installedAt < endMs && install.installedAt <= asOf));
  const reports = new Map<string, VersionConversions>();
  for (const install of selected.values()) {
    const version = journeyVersion(install.appVersion);
    const report = reports.get(version) ?? emptyVersionConversions();
    const group = acquisitionGroup(attributes.get(install.appUserId));
    report.global.installs++;
    report[group].installs++;
    if (group !== "nonAds") report.ads.installs++;
    reports.set(version, report);
  }
  const observed = events.filter((event) => Number.isFinite(event.eventTs) && event.eventTs <= asOf);
  const owners = new Map<string, { user: string; at: number }>();
  for (const event of observed) {
    if (event.name !== "initial_purchase" || event.isRefund || !event.originalTransactionId || !event.appUserId) continue;
    const existing = owners.get(event.originalTransactionId);
    if (!existing || event.eventTs < existing.at) owners.set(event.originalTransactionId, { user: event.appUserId, at: event.eventTs });
  }
  const trials = new Map<string, Outcome>();
  const paidUsers = new Set<string>();
  const installPaidUsers = new Set<string>();
  const money = new Map<string, { event: Outcome; user: string }>();
  const userProceeds = new Map<string, number>();
  const targets = (user: string) => {
    const report = reports.get(journeyVersion(selected.get(user)!.appVersion))!;
    const group = acquisitionGroup(attributes.get(user));
    return group === "nonAds" ? [report.global, report[group]] : [report.global, report.ads, report[group]];
  };
  for (const event of observed) {
    const owner = owners.get(event.originalTransactionId);
    const user = owner?.user ?? event.appUserId;
    const install = selected.get(user);
    if (!install) continue;
    const outcomeStart = Math.max(install.installedAt, outcomesStart?.get(user) ?? install.installedAt);
    if (event.eventTs < outcomeStart || (owner && owner.at < outcomeStart)) continue;
    if (event.name === "initial_purchase" && event.periodType === "trial" && !event.isRefund) {
      const previous = trials.get(user);
      if (!previous || event.eventTs < previous.eventTs || (event.eventTs === previous.eventTs && event.attributionTs > previous.attributionTs)) trials.set(user, event);
    }
    if (!isMobileMoneyEvent(event) && !event.isRefund) continue;
    const key = `${event.originalTransactionId || user}|${event.transactionId || event.eventTs}|${event.isRefund ? "refund" : "charge"}`;
    const previous = money.get(key);
    if (!previous || event.attributionTs > previous.event.attributionTs) money.set(key, { event, user });
  }
  for (const [user, trial] of trials) {
    for (const metric of targets(user)) {
      metric.trials++;
      if (Number.isFinite(trial.expiresAt) && trial.expiresAt > trial.eventTs && trial.expiresAt <= asOf) metric.finishedTrials++;
    }
  }
  for (const { event, user } of money.values()) {
    if (event.netProceeds != null && Number.isFinite(event.netProceeds)) {
      userProceeds.set(user, (userProceeds.get(user) ?? 0) + event.netProceeds);
    }
    // Free trial starts need no amount; all other cohort money includes refunds and renewals.
    const freeTrial = event.name === "initial_purchase" && event.periodType === "trial" && !event.isRefund;
    for (const metric of targets(user)) {
      if (event.isRefund) metric.refunds++;
      else if (!freeTrial && event.netProceeds != null && Number.isFinite(event.netProceeds) && event.netProceeds > 0) metric.purchases++;
      if (event.netProceeds != null && Number.isFinite(event.netProceeds)) metric.proceeds += event.netProceeds;
      else if (!freeTrial) metric.missingProceeds = true;
    }
    if (!event.isRefund && event.periodType !== "trial" && isMobileMoneyEvent(event)) {
      if (event.netProceeds == null || !Number.isFinite(event.netProceeds)) {
        for (const metric of targets(user)) metric.missingInstallMoney = true;
      } else if (event.netProceeds > 0 && !installPaidUsers.has(user)) {
        installPaidUsers.add(user);
        for (const metric of targets(user)) metric.installPaid++;
      }
    }
    const trial = trials.get(user);
    // Wait for the scheduled trial end, even if cancelled early. Unknown ends are excluded.
    if (!trial || !Number.isFinite(trial.expiresAt) || trial.expiresAt <= trial.eventTs || trial.expiresAt > asOf
      || !trial.originalTransactionId || event.originalTransactionId !== trial.originalTransactionId
      || event.eventTs < trial.eventTs || event.periodType === "trial") continue;
    if (event.isRefund) continue; // A refund does not undo having converted to paid.
    if (event.netProceeds == null || !Number.isFinite(event.netProceeds)) {
      // Zero-cost trial starts do not need a payment amount to establish trial conversion.
      if (!(event.name === "initial_purchase" && event.periodType === "trial")) for (const metric of targets(user)) metric.missingMoney = true;
    } else if (event.netProceeds > 0 && isMobileMoneyEvent(event) && !paidUsers.has(user)) {
      paidUsers.add(user);
      for (const metric of targets(user)) metric.paid++;
    }
  }
  // The sampling unit is an install, never a transaction. Renewals/refunds belong
  // to the same user's total; every non-payer contributes a zero observation.
  for (const report of reports.values()) for (const metric of Object.values(report)) {
    if (metric.installs > 1 && !metric.missingProceeds) metric.proceedsVariance = 0;
  }
  for (const user of selected.keys()) for (const metric of targets(user)) {
    if (metric.proceedsVariance == null) continue;
    metric.proceedsVariance += ((userProceeds.get(user) ?? 0) - metric.proceeds / metric.installs) ** 2 / (metric.installs - 1);
  }
  return reports;
}
