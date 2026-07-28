/**
 * Historical grounding: what REG's own record says about a place.
 *
 * Hard rule from the build plan -- every statistic carries its sample size
 * `n`, and anything computed from fewer than 5 records is labelled `low`
 * confidence. A sector with two historical outages will otherwise produce a
 * confident-sounding average, and the model will launder it into a promise.
 */

import { outagesForPlace, kigaliNow, type Outage } from "./outages";

export type Confidence = "low" | "medium" | "high";

export type History = {
  district: string;
  sector: string | null;
  /** Records used, all time. */
  n: number;
  /** Records in the 365 days before `now`. */
  count365d: number;
  /** Mean published duration, minutes. Null when nothing had an end time. */
  meanDurationMinutes: number | null;
  medianDurationMinutes: number | null;
  /** How many of the n records actually had a duration to average. */
  durationSampleSize: number;
  /** Most common start hour, 0-23. Null when unknown. */
  typicalHour: number | null;
  /** Most frequently named feeder for this place. */
  feeder: string | null;
  /** Most common reason category. */
  commonReason: string | null;
  /** How many records REG published with no end time -- the no-ETA rate. */
  noEndTimeCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  confidence: Confidence;
};

function mostCommon<T>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function confidenceFor(n: number): Confidence {
  if (n < 5) return "low";
  if (n < 15) return "medium";
  return "high";
}

export function historyFor(district: string, sector: string | null, now: Date): History {
  const records = outagesForPlace(district, sector);
  return summarise(district, sector, records, now);
}

export function summarise(
  district: string,
  sector: string | null,
  records: Outage[],
  now: Date,
): History {
  const { date } = kigaliNow(now);
  const yearAgo = new Date(new Date(date).getTime() - 365 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const durations = records
    .map((o) => o.duration_minutes)
    .filter((d): d is number => typeof d === "number" && d > 0);

  const hours = records
    .map((o) => (o.start_time ? Number(o.start_time.slice(0, 2)) : null))
    .filter((h): h is number => h !== null);

  const dates = records.map((o) => o.date).sort();

  return {
    district,
    sector,
    n: records.length,
    count365d: records.filter((o) => o.date >= yearAgo && o.date <= date).length,
    meanDurationMinutes: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null,
    medianDurationMinutes: median(durations),
    durationSampleSize: durations.length,
    typicalHour: mostCommon(hours),
    feeder: mostCommon(records.map((o) => o.feeder).filter((f): f is string => !!f)),
    commonReason: mostCommon(records.map((o) => o.reason_category)),
    noEndTimeCount: records.filter((o) => !o.end_time).length,
    firstSeen: dates[0] ?? null,
    lastSeen: dates[dates.length - 1] ?? null,
    confidence: confidenceFor(durations.length),
  };
}

/** Dataset-wide numbers, for the README and the "how do you know" question. */
export function datasetSummary(records: Outage[]) {
  const dates = records.map((o) => o.date).sort();
  return {
    records: records.length,
    districts: new Set(records.map((o) => o.district)).size,
    sectors: new Set(records.filter((o) => o.sector !== "*").map((o) => `${o.district}/${o.sector}`)).size,
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
  };
}
