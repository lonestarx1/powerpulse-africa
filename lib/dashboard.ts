/**
 * Server-only aggregates for the dashboard.
 *
 * All of this is arithmetic over the committed REG records -- no model is
 * involved, which is why the dashboard paints on the first server render and
 * keeps working if the Google key dies mid-demo.
 */

import { kigaliNow, normKey, outages, places, type Outage, type Place } from "./outages";
import type { PlaceOption } from "./ui";

/** Most-referenced sectors, for the "where are you?" picker. */
export function topSectors(limit = 8): Place[] {
  return places.filter((p) => p.sector !== null).slice(0, limit);
}

/** Every district in the published records, alphabetical, with its volume. */
export function allDistricts(): { district: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const o of outages) counts.set(o.district, (counts.get(o.district) ?? 0) + 1);
  return [...counts.entries()]
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => a.district.localeCompare(b.district));
}

/**
 * Best spelling for each place name, keyed by match key.
 *
 * REG's own listing spells seven sectors two ways -- "Nyamirambo" 19 times and
 * "NYamirambo" once, "Nyakabanda" 3 times and "NYakabanda" 5. Grouping by the
 * printed name splits one place into two rows with split counts, which is
 * plainly wrong the moment you filter and see them side by side. Everything
 * downstream (outagesForPlace, placesForKey) already matches on the normalised
 * key, so both rows would have shown the same records anyway.
 *
 * The dominant spelling is not always the right one, so frequency only breaks
 * ties: a name that starts with one capital and continues lowercase wins first.
 */
const bestSpelling = (() => {
  const census = new Map<string, Map<string, number>>();
  for (const o of outages) {
    if (o.sector === "*") continue;
    const id = `${o.district_key}/${o.sector_key}`;
    const seen = census.get(id) ?? new Map<string, number>();
    seen.set(o.sector, (seen.get(o.sector) ?? 0) + 1);
    census.set(id, seen);
  }

  const tidy = (name: string) => (/^[A-Z][^A-Z]/.test(name) ? 1 : 0);
  const best = new Map<string, string>();
  for (const [id, seen] of census) {
    best.set(
      id,
      [...seen.entries()].sort(
        (a, b) => tidy(b[0]) - tidy(a[0]) || b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0][0],
    );
  }
  return best;
})();

function displayName(districtKey: string, sectorKey: string, fallback: string): string {
  return bestSpelling.get(`${districtKey}/${sectorKey}`) ?? fallback;
}

/**
 * Sectors REG has named inside a district, most-referenced first.
 * A district-wide row ("All sectors in Rutsiro") is surfaced as its own
 * option rather than silently expanded -- we only claim what was published.
 */
export function sectorsIn(district: string): { sector: string | null; count: number }[] {
  const key = normKey(district);
  const counts = new Map<string, { sector: string; count: number }>();
  let wide = 0;

  for (const o of outages) {
    if (o.district_key !== key) continue;
    if (o.sector === "*") {
      wide += 1;
      continue;
    }
    const hit = counts.get(o.sector_key);
    if (hit) hit.count += 1;
    else {
      counts.set(o.sector_key, {
        sector: displayName(o.district_key, o.sector_key, o.sector),
        count: 1,
      });
    }
  }

  const list = [...counts.values()]
    .map(({ sector, count }) => ({ sector: sector as string | null, count }))
    .sort((a, b) => b.count - a.count || (a.sector ?? "").localeCompare(b.sector ?? ""));

  // "Whole district" always available, and it carries the district-wide rows.
  return [{ sector: null, count: wide }, ...list];
}

/**
 * The place index in the shape the browser gets: name, count and a match key,
 * nothing else. ~1,000 entries, ~40KB before compression -- small enough to
 * filter on every keystroke, and it keeps `outages` (2.5MB) server-side.
 *
 * Order is inherited from `places`: most-confidently-named first, so a stable
 * filter surfaces the common reading of an ambiguous name.
 */
export function placeOptions(): PlaceOption[] {
  return places.map((p) => ({
    district: p.district,
    sector: p.sector ? displayName(normKey(p.district), p.key, p.sector) : null,
    match: `${normKey(p.district)} ${p.sector ? p.key : ""}`.trimEnd(),
    count: p.count,
  }));
}

/** Substring search over the place index, common readings first. */
export function findPlaces(query: string, limit = 12): Place[] {
  const q = query
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!q) return [];
  return places
    .filter((p) => p.key.includes(q) || p.district.toLowerCase().includes(q))
    .slice(0, limit);
}

export type UpcomingGroup = {
  key: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  districts: string[];
  areaCount: number;
};

/**
 * Published outages still in the future, grouped back into the notice they
 * came from. The parser explodes one REG row into one record per affected
 * area; showing 11 identical rows would be noise, so we regroup.
 */
export function upcomingNational(now: Date, limit = 4): UpcomingGroup[] {
  const { date: today, minute } = kigaliNow(now);
  const groups = new Map<string, UpcomingGroup>();

  for (const o of outages) {
    if (o.date < today) continue;
    if (o.date === today && o.start_time) {
      const [h, m] = o.start_time.split(":").map(Number);
      if (h * 60 + m <= minute) continue;
    }

    const key = `${o.date}|${o.start_time ?? ""}|${o.reason_raw}`;
    const group = groups.get(key);
    if (group) {
      if (!group.districts.includes(o.district)) group.districts.push(o.district);
      group.areaCount += 1;
      continue;
    }
    groups.set(key, {
      key,
      date: o.date,
      startTime: o.start_time,
      endTime: o.end_time,
      reason: o.reason_raw,
      districts: [o.district],
      areaCount: 1,
    });
  }

  return [...groups.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""))
    .slice(0, limit);
}

/** Longest published window on record for a place. Null when none had an end. */
export function longestDuration(records: Outage[]): number | null {
  let max: number | null = null;
  for (const o of records) {
    if (typeof o.duration_minutes === "number" && (max === null || o.duration_minutes > max)) {
      max = o.duration_minutes;
    }
  }
  return max;
}

/** How many of the published windows would outlast an unopened fridge. */
export function overThreshold(records: Outage[], hours: number): number {
  const limit = hours * 60;
  return records.filter((o) => (o.duration_minutes ?? 0) > limit).length;
}
