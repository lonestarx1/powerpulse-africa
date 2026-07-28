/**
 * Presentation helpers shared by the server components.
 *
 * Everything here is deterministic formatting over data that is already true.
 * Nothing in this file may invent a number -- in particular, `stateOf` must
 * never produce a "timed" state for a record REG published without an end
 * time, because the whole visual language keys off that distinction: no
 * published end time means no ring, no progress arc, no ticking number.
 */

import type { Live, Outage } from "./outages";

/** Rwanda is UTC+2 year round, no DST. Mirrors KIGALI_OFFSET_MINUTES. */
export const KIGALI_TZ = "+02:00";

export const PROFILES = ["household", "shop_owner", "remote_worker"] as const;
export type Profile = (typeof PROFILES)[number];

export function isProfile(value: unknown): value is Profile {
  return typeof value === "string" && (PROFILES as readonly string[]).includes(value);
}

export const PROFILE_META: Record<
  Profile,
  { label: string; labelRw: string; glyph: string; blurb: string; focus: string[] }
> = {
  household: {
    label: "Household",
    labelRw: "Urugo",
    glyph: "◍",
    blurb: "Food, light, phones, water",
    focus: ["Fridge and freezer", "Light after dark", "Phone charge", "Water pump"],
  },
  shop_owner: {
    label: "Shop",
    labelRw: "Ubucuruzi",
    glyph: "◈",
    blurb: "Cold stock, generator, customers",
    focus: ["Cold stock", "Generator fuel", "What to tell customers", "Sell down or move"],
  },
  remote_worker: {
    label: "Remote work",
    labelRw: "Akazi",
    glyph: "◆",
    blurb: "Battery, deadlines, where to go",
    focus: ["Battery budget", "Tethering data", "Whether to relocate", "What to tell the team"],
  },
};

/* ------------------------------------------------------------------ state */

export type OutageState = "timed" | "open" | "clear";

/**
 * Three states, and the difference between the first two is the product.
 * `open` means REG says the power is out and has published no end time --
 * we render that as a deliberate, designed absence, never as an estimate.
 */
export function stateOf(live: Live): OutageState {
  if (!live.active) return "clear";
  return live.active.end_time ? "timed" : "open";
}

export const STATE_META: Record<
  OutageState | "ask",
  { color: string; text: string; ring: string; border: string; bg: string; dot: string }
> = {
  timed: {
    color: "var(--color-timed)",
    text: "text-timed",
    ring: "stroke-timed",
    border: "border-timed/30",
    bg: "bg-timed/10",
    dot: "bg-timed",
  },
  open: {
    color: "var(--color-open)",
    text: "text-open",
    ring: "stroke-open",
    border: "border-open/30",
    bg: "bg-open/10",
    dot: "bg-open",
  },
  clear: {
    color: "var(--color-clear)",
    text: "text-clear",
    ring: "stroke-clear",
    border: "border-clear/30",
    bg: "bg-clear/10",
    dot: "bg-clear",
  },
  ask: {
    color: "var(--color-ask)",
    text: "text-ask",
    ring: "stroke-ask",
    border: "border-ask/30",
    bg: "bg-ask/10",
    dot: "bg-ask",
  },
};

/* ------------------------------------------------------------------- time */

/**
 * A Kigali wall-clock date + HH:MM as an absolute instant, so the client can
 * do countdown arithmetic without knowing anything about timezones.
 */
export function instantOf(date: string, hhmm: string | null): string | null {
  if (!hhmm) return null;
  return `${date}T${hhmm}:00${KIGALI_TZ}`;
}

/** Minutes -> "2h", "1h 15m", "45m". Never "0h 45m". */
export function fmtDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Format an ISO date (YYYY-MM-DD) without letting the server's local timezone
 * shift it. Noon UTC is safely inside the day in every timezone we care about.
 */
function atNoonUTC(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
}

/** "5 Aug" */
export function fmtDate(isoDate: string): string {
  const d = atNoonUTC(isoDate);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Wed 5 Aug" */
export function fmtDayDate(isoDate: string): string {
  const d = atNoonUTC(isoDate);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "5 August 2026" */
export function fmtDateLong(isoDate: string): string {
  const d = atNoonUTC(isoDate);
  const full = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][d.getUTCMonth()];
  return `${d.getUTCDate()} ${full} ${d.getUTCFullYear()}`;
}

/** "Today" / "Tomorrow" / "Wed 5 Aug", relative to the Kigali date given. */
export function fmtRelativeDay(isoDate: string, todayISO: string): string {
  if (isoDate === todayISO) return "Today";
  const diff = Math.round(
    (atNoonUTC(isoDate).getTime() - atNoonUTC(todayISO).getTime()) / 86_400_000,
  );
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return fmtDayDate(isoDate);
}

/** "12:00 – 14:00", or "from 12:00" when REG published no end. */
export function fmtWindow(start: string | null, end: string | null): string {
  if (start && end) return `${start} – ${end}`;
  if (start) return `from ${start}`;
  return "time not published";
}

/** "12:00" from an hour number. */
export function fmtHour(hour: number | null): string {
  if (hour == null) return "—";
  return `${String(hour).padStart(2, "0")}:00`;
}

/* -------------------------------------------------------------- the clock */

/**
 * `?at=` pins "now" so a demo can show a live outage on cue.
 *
 * This is not a nicety: there are no REG records dated today, so against the
 * real clock every query returns the "nothing published" state and there is
 * no product to film. See docs/UX_PLAN.md §6.
 */
export function parseAt(value: string | string[] | undefined): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  // Bare "2026-08-05T12:45" is read as Kigali wall-clock, which is what
  // someone typing a demo URL means.
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : `${raw}${KIGALI_TZ}`;
  const d = new Date(withZone);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ------------------------------------------------------------------ stats */

export type MonthBucket = { key: string; label: string; count: number };

/** Outages per month for the last `months` months, oldest first. */
export function monthlyCounts(
  records: Outage[],
  todayISO: string,
  months = 12,
): MonthBucket[] {
  const end = atNoonUTC(todayISO);
  const buckets: MonthBucket[] = [];
  const index = new Map<string, number>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    index.set(key, buckets.length);
    buckets.push({ key, label: MONTHS[d.getUTCMonth()], count: 0 });
  }

  for (const r of records) {
    const key = r.date.slice(0, 7);
    const at = index.get(key);
    if (at !== undefined) buckets[at].count += 1;
  }

  return buckets;
}

/** Human label for a place. `null` sector means the whole district. */
export function placeLabel(district: string, sector: string | null): string {
  return sector ? `${sector}, ${district}` : `${district} district`;
}

/** Serialise a place for a URL: "Gasabo|Kinyinya" or "Gasabo|". */
export function encodePlace(district: string, sector: string | null): string {
  return `${district}|${sector ?? ""}`;
}

export function decodePlace(
  value: string | string[] | undefined,
): { district: string; sector: string | null } | null {
  if (typeof value !== "string" || !value.includes("|")) return null;
  const [district, sector] = value.split("|");
  if (!district) return null;
  return { district, sector: sector || null };
}

/** Sentence-case a reason category for a chip. */
export function fmtReason(category: string | null): string {
  if (!category) return "—";
  return category.charAt(0).toUpperCase() + category.slice(1);
}
