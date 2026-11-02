import { isMobileMoneyEvent } from "./mobile-app-money";
import { versionCohortConversions } from "./version-cohort-conversions";
import type { RealizedAppu } from "./realized-appu";

/** Superwall records attribution and subscription outcomes; its imported ad spend is campaign-level. */
export const APPLE_ADS_KEYWORD_ATTRIBUTE_KEYS = [
  "apple_search_ads_attribution", "apple_search_ads_campaign_id",
  "apple_search_ads_keyword_id", "apple_search_ads_keyword_name",
  "acquisition_keyword_id", "acquisition_keyword_name",
  "apple_search_ads_country_or_region", "acquisition_source",
  "gp1_a_native_yearly_prices_v4", "gp1_a_native_yearly_prices_v5",
  "gp1_a_versy_onboarding_outcomes_v1", "yearly_price_assigned_at", "yearly_price_product_id",
] as const;

type Install = { appUserId: string; installedAt: number; appVersion: string };
type Outcome = Parameters<typeof versionCohortConversions>[1][number] & { purchasedAt?: number };
export type AppleAdsKeywordRow = {
  key: string; keyword: string; campaignId: string; keywordIds: string[];
  users: number; trials: number; finishedTrials: number; convertedTrials: number;
  paidUsers: number; proceeds: number; missingMoney: boolean; realizedAppu?: RealizedAppu;
  spend?: number | null; spendCurrency?: string; spendUsd?: number | null;
  realizedRoas?: number | null;
  realizedRoasBasis?: {
    startMs: number; endMs: number; users: number; matureUsers: number;
    proceeds: number; spendUsd: number | null; missingMoney: boolean;
  };
};
export type AppleAdsKeywordReport = {
  available: boolean;
  rows: AppleAdsKeywordRow[];
  countries: Record<string, AppleAdsKeywordRow[]>;
  excludedConflictingAttribution: number;
};

function countryCode(raw: string | undefined): string {
  const value = (raw ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : "unknown";
}

/**
 * The unit is a Superwall first-launch user, not an Apple Ads download. Combine
 * transferred IDs only when Superwall gives the same keyword name and campaign.
 */
export function buildAppleAdsKeywordReport(installs: Install[], events: Outcome[],
  attributes: Map<string, Record<string, string>>, startMs: number, endMs: number, asOf: number): AppleAdsKeywordReport {
  const selected = new Map<string, Install>();
  for (const install of installs) {
    if (!install.appUserId || !Number.isFinite(install.installedAt) || install.installedAt < startMs
      || install.installedAt >= endMs || install.installedAt > asOf) continue;
    const previous = selected.get(install.appUserId);
    if (!previous || install.installedAt < previous.installedAt) selected.set(install.appUserId, install);
  }
  const members: { install: Install; key: string; keyword: string; campaignId: string; id: string; country: string }[] = [];
  let excludedConflictingAttribution = 0;
  for (const install of selected.values()) {
    const attr = attributes.get(install.appUserId);
    if (attr?.apple_search_ads_attribution?.trim().toLowerCase() !== "true") continue;
    if (attr.acquisition_source?.trim().toLowerCase() === "meta") { excludedConflictingAttribution++; continue; }
    const campaignId = attr.apple_search_ads_campaign_id?.trim() || "unknown";
    const id = (attr.apple_search_ads_keyword_id || attr.acquisition_keyword_id || "").trim();
    const name = (attr.apple_search_ads_keyword_name || attr.acquisition_keyword_name || "").trim().replace(/\s+/g, " ");
    const keyword = name || (id ? `Keyword ${id}` : "Unknown keyword");
    const key = `${campaignId}|${name ? name.normalize("NFKC").toLowerCase() : `id:${id || "unknown"}`}`;
    members.push({ install, key, keyword, campaignId, id, country: countryCode(attr.apple_search_ads_country_or_region) });
  }

  // Apple's server may send a renewal before its purchasedAt boundary. Do not
  // count that money or conversion until the paid period actually starts.
  const missingDateUsers = new Set<string>();
  const adjusted = events.map((event) => {
    const isTrial = event.name === "initial_purchase" && event.periodType === "trial" && !event.isRefund;
    if (isTrial || (!isMobileMoneyEvent(event) && !event.isRefund)) return event;
    if (!Number.isFinite(event.purchasedAt)) { missingDateUsers.add(event.appUserId); return { ...event, eventTs: Infinity }; }
    return { ...event, eventTs: Math.max(event.eventTs, event.purchasedAt!) };
  });

  const build = (country?: string): AppleAdsKeywordRow[] => {
    const eligible = country ? members.filter((member) => member.country === country) : members;
    const groups = new Map<string, { version: string; keyword: string; campaignId: string; ids: Set<string>; users: Set<string> }>();
    for (const member of eligible) {
      let group = groups.get(member.key);
      if (!group) {
        group = { version: `1.${groups.size + 1}`, keyword: member.keyword, campaignId: member.campaignId, ids: new Set(), users: new Set() };
        groups.set(member.key, group);
      }
      if (member.id) group.ids.add(member.id);
      group.users.add(member.install.appUserId);
    }
    const cohort = eligible.map((member) => ({ ...member.install, appVersion: groups.get(member.key)!.version }));
    const metrics = versionCohortConversions(cohort, adjusted, attributes, startMs, endMs, asOf);
    return [...groups].map(([key, group]) => {
      const metric = metrics.get(group.version)!.global;
      return { key, keyword: group.keyword, campaignId: group.campaignId, keywordIds: [...group.ids].sort(),
        users: metric.installs, trials: metric.trials, finishedTrials: metric.finishedTrials,
        convertedTrials: metric.paid, paidUsers: metric.installPaid, proceeds: metric.proceeds, realizedAppu: metric.realizedAppu,
        missingMoney: metric.missingProceeds || [...group.users].some((user) => missingDateUsers.has(user)) };
    }).sort((a, b) => b.users - a.users || a.keyword.localeCompare(b.keyword));
  };
  const countries = Object.fromEntries([...new Set(members.map((member) => member.country))].map((country) => [country, build(country)]));
  return { available: true, rows: build(), countries, excludedConflictingAttribution };
}
