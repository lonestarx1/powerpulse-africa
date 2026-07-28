/**
 * The freemium line, in one place.
 *
 * The split follows the architecture rather than cutting across it:
 *
 *   FREE  — everything the utility published. Live status, the full outage
 *           history for your area, the national schedule, and the raw record
 *           behind every claim. All of it deterministic, none of it costs us
 *           a model call.
 *
 *   PRO   — judgment about it. Advice conditioned on your profile and on the
 *           actual duration, and being told before a planned outage instead of
 *           having to look it up.
 *
 * That line is honest about the economics (the paid features are the ones with
 * a marginal cost per user) and it means the free tier is genuinely useful on
 * its own rather than a crippled demo.
 */

export const TIERS = ["free", "pro"] as const;
export type Tier = (typeof TIERS)[number];

export function isTier(value: unknown): value is Tier {
  return value === "free" || value === "pro";
}

/** RWF, per month. Mobile money is the rail people actually use here. */
export const PRICE = {
  amount: 500,
  currency: "RWF",
  period: "month",
  display: "RWF 500",
  rails: ["MTN MoMo", "Airtel Money"],
} as const;

export const FREE_FEATURES = [
  "Live outage status for your sector",
  "Every outage the utility has published for your area",
  "How often, how long, and when they usually start",
  "The raw published record behind every number",
  "The national schedule for the week ahead",
] as const;

export const PRO_FEATURES = [
  "Advice built for your situation — household, shop, or remote work",
  "Alerts before a planned outage in your area, not after",
  "Ask follow-up questions in Kinyarwanda or English",
  "Food and cold-stock calls tied to the actual outage length",
] as const;

export function can(tier: Tier, feature: "advice" | "alerts"): boolean {
  if (tier === "pro") return true;
  return feature !== "advice" && feature !== "alerts";
}

/** How far ahead a Pro alert fires, in minutes. */
export const ALERT_LEAD_MINUTES = 120;
