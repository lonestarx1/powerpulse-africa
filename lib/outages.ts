/**
 * Load and index the parsed REG outage records.
 *
 * data/outages.json is produced by scripts/parse_outages.py and imported
 * directly -- it is ~3200 records of static, committed data, so there is no
 * database and no fetch. Everything here runs server-side only.
 */

import raw from "@/data/outages.json";

export type Status = "planned" | "current" | "past";

export type Outage = {
  outage_id: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  /** HH:MM, 24h. Null when REG published no start. */
  start_time: string | null;
  /** HH:MM, 24h. Null when REG published no end -- do not impute one. */
  end_time: string | null;
  duration_minutes: number | null;
  /** REG wrote "- Now": still out at publication, no ETA. */
  ongoing: boolean;
  district: string;
  district_key: string;
  /** "*" means district-wide ("All sectors in Rutsiro"). */
  sector: string;
  sector_key: string;
  /** True when the row named several districts and we could not tell which. */
  district_inferred: boolean;
  reason_raw: string;
  reason_category: string;
  feeder: string | null;
  status: Status;
  sector_areas_raw: string;
  page_number: number | null;
  source_url: string | null;
};

export type Dataset = {
  source_url: string;
  scraped_at: string;
  parsed_at: string;
  raw_row_count: number;
  record_count: number;
  flagged_row_count: number;
  dropped_row_count: number;
  records: Outage[];
};

export const dataset = raw as unknown as Dataset;
export const outages: Outage[] = dataset.records;

/** Match key: accent-free, lowercase, alphanumeric only. Mirrors norm() in the parser. */
export function normKey(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export type Place = {
  district: string;
  /** null for a district-level place. */
  sector: string | null;
  key: string;
  /** How many records mention it -- used to break ties toward the common reading. */
  count: number;
  /**
   * Of those, how many came from a row where the district was certain.
   * "Masaka" appears under Kicukiro (14 confirmed rows) and also under Gasabo
   * and Rwamagana purely because a multi-district row could not be split. Only
   * confirmed readings should make a name look ambiguous.
   */
  confirmedCount: number;
};

function buildPlaces(): Place[] {
  const bySector = new Map<string, Place>();
  const byDistrict = new Map<string, Place>();

  for (const o of outages) {
    const confirmed = o.district_inferred ? 0 : 1;

    const d = byDistrict.get(o.district_key);
    if (d) {
      d.count += 1;
      d.confirmedCount += confirmed;
    } else {
      byDistrict.set(o.district_key, {
        district: o.district, sector: null, key: o.district_key,
        count: 1, confirmedCount: confirmed,
      });
    }

    if (o.sector === "*") continue;
    const id = `${o.district_key}/${o.sector_key}`;
    const s = bySector.get(id);
    if (s) {
      s.count += 1;
      s.confirmedCount += confirmed;
    } else {
      bySector.set(id, {
        district: o.district, sector: o.sector, key: o.sector_key,
        count: 1, confirmedCount: confirmed,
      });
    }
  }

  return [...bySector.values(), ...byDistrict.values()].sort(
    (a, b) => b.confirmedCount - a.confirmedCount || b.count - a.count,
  );
}

export const places: Place[] = buildPlaces();

/** Every place sharing a sector key -- "Nyarugenge" is both a district and a sector. */
export function placesForKey(key: string): Place[] {
  return places.filter((p) => p.key === key);
}

/**
 * All records affecting a place, newest first.
 * District-wide rows ("All sectors in X") count for every sector in X.
 */
export function outagesForPlace(district: string, sector: string | null): Outage[] {
  const dKey = normKey(district);
  const sKey = sector ? normKey(sector) : null;
  return outages
    .filter((o) => {
      if (o.district_key !== dKey) return false;
      if (!sKey) return true;
      return o.sector_key === sKey || o.sector === "*";
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Rwanda is UTC+2 year round (CAT, no DST). All wall-clock maths uses this. */
export const KIGALI_OFFSET_MINUTES = 120;

/** Wall-clock date + minute-of-day in Kigali for an absolute instant. */
export function kigaliNow(now: Date): { date: string; minute: number } {
  const shifted = new Date(now.getTime() + KIGALI_OFFSET_MINUTES * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minute: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export type Live = {
  /** Happening right now, per REG's published window. */
  active: Outage | null;
  /** The next published outage for this place, if any. */
  next: Outage | null;
  /** Minutes until `active` ends. Null when REG published no end time. */
  minutesRemaining: number | null;
};

/**
 * What REG has published for this place around `now`.
 *
 * `now` is passed in rather than read from the clock so the API route, the
 * eval harness and the demo can all agree on a moment.
 */
export function liveStatus(records: Outage[], now: Date): Live {
  const { date, minute } = kigaliNow(now);

  let active: Outage | null = null;
  let next: Outage | null = null;

  for (const o of records) {
    if (o.date === date && o.start_time) {
      const start = minutesOfDay(o.start_time);
      const end = o.end_time ? minutesOfDay(o.end_time) : null;
      const started = minute >= start;
      const ended = end !== null && minute > (end < start ? end + 24 * 60 : end);
      if (started && !ended) {
        active = o;
        break;
      }
    }
  }

  const upcoming = records
    .filter((o) => o.date > date || (o.date === date && o.start_time && minutesOfDay(o.start_time) > minute))
    .sort((a, b) => a.date.localeCompare(b.date));
  next = upcoming[0] ?? null;

  let minutesRemaining: number | null = null;
  if (active?.end_time) {
    const end = minutesOfDay(active.end_time);
    const start = active.start_time ? minutesOfDay(active.start_time) : 0;
    minutesRemaining = (end < start ? end + 24 * 60 : end) - minute;
  }

  return { active, next, minutesRemaining };
}
