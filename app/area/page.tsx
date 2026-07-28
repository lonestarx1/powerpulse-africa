/**
 * The area screen: what the utility has actually published about this place.
 *
 * Everything here is arithmetic over the committed REG records. No model is
 * involved, which is why it paints on the first server render and keeps
 * working if the Google key dies mid-demo. The assistant lives one tap away
 * on /chat, and it answers from this same record.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfidenceTag, Sparkbars, Stat } from "@/components/bits";
import { AccountChip, Header, PinnedClockBanner } from "@/components/chrome";
import { AlertsCard, LockIcon, PlanBadge } from "@/components/paywall";
import { RecordRow } from "@/components/record-sheet";
import { NoEtaNote, StatusHero, recordFields } from "@/components/status-hero";
import foodSafety from "@/data/food_safety.json";
import { longestDuration, overThreshold, upcomingNational } from "@/lib/dashboard";
import { copyFor } from "@/lib/i18n";
import { ALERT_LEAD_MINUTES } from "@/lib/tier";
import { kigaliNow, liveStatus, outagesForPlace } from "@/lib/outages";
import { readPrefs } from "@/lib/prefs";
import { historyFor } from "@/lib/stats";
import {
  PROFILE_META,
  STATE_META,
  fmtDate,
  fmtDayDate,
  fmtDuration,
  fmtHour,
  fmtReason,
  fmtRelativeDay,
  fmtWindow,
  monthlyCounts,
  parseAt,
  placeLabel,
  stateOf,
  type Profile,
} from "@/lib/ui";

type Params = { [key: string]: string | string[] | undefined };

export default async function AreaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { profile, place, lang, tier, alerts, user } = await readPrefs();
  if (!profile) redirect("/start");
  if (!place) redirect("/location");

  const t = copyFor(lang);
  const at = typeof params.at === "string" ? params.at : undefined;
  const pinned = parseAt(params.at);
  const now = pinned ?? new Date();
  const nowISO = now.toISOString();
  const today = kigaliNow(now).date;

  const records = outagesForPlace(place.district, place.sector);
  const live = liveStatus(records, now);
  const history = historyFor(place.district, place.sector, now);
  const state = stateOf(live);
  const meta = STATE_META[state];

  const months = monthlyCounts(records, today, 12);
  const past = records.filter((o) => o.date <= today).slice(0, 8);
  const upcomingHere = records
    .filter((o) => o.date > today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const national = upcomingNational(now, 4);

  const fridgeHours = foodSafety.refrigerator.safe_hours_unopened;
  const longest = longestDuration(records);
  const overFridge = overThreshold(records, fridgeHours);

  const chatHref = at ? `/chat?at=${encodeURIComponent(at)}` : "/chat";
  const areaHref = at ? `/area?at=${encodeURIComponent(at)}` : "/area";
  const lead = fmtDuration(ALERT_LEAD_MINUTES);
  const nextHere = upcomingHere[0] ?? null;

  return (
    <main className="flex flex-1 flex-col pb-10">
      <Header
        lang={lang}
        next={areaHref}
        profile={profile}
        right={
          <>
            <PlanBadge tier={tier} />
            <AccountChip user={user} next={areaHref} />
          </>
        }
      />
      {pinned ? <PinnedClockBanner label={`${fmtDayDate(today)}, ${nowLabel(now)}`} /> : null}

      {/* ------------------------------------------------------- right now */}
      <div className="pt-2">
        <StatusHero
          district={place.district}
          sector={place.sector}
          live={live}
          nowISO={nowISO}
          todayISO={today}
          changeHref="/location"
        />
      </div>

      {state === "open" ? (
        <div className="mt-5 px-4">
          <NoEtaNote noEndTimeCount={history.noEndTimeCount} n={history.n} />
        </div>
      ) : null}

      {/* --------------------------------------------------- ask assistant */}
      <div className="mt-6 px-4">
        {tier === "pro" ? (
          <Link
            href={chatHref}
            className="flex items-center gap-3 rounded-card border border-ask/35 bg-ask/10 px-4 py-3.5 transition active:scale-[0.985]"
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-ask/20 text-ask"
            >
              ✦
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">{t.askAssistant}</span>
              <span className="block truncate text-[11.5px] text-muted">{t.askAssistantSub}</span>
            </span>
            <span aria-hidden className="shrink-0 text-faint">
              ›
            </span>
          </Link>
        ) : (
          <Link
            href={`/upgrade?next=${encodeURIComponent(chatHref)}`}
            className="flex items-center gap-3 rounded-card border border-timed/30 bg-surface px-4 py-3.5 transition active:scale-[0.985]"
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-timed/15 text-timed"
            >
              <LockIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">{t.askAssistant}</span>
              <span className="block truncate text-[11.5px] text-muted">
                Advice for a {PROFILE_META[profile].label.toLowerCase()} — Pro
              </span>
            </span>
            <span aria-hidden className="shrink-0 text-faint">
              ›
            </span>
          </Link>
        )}
      </div>

      {/* ------------------------------------------------------- alerts */}
      <div className="mt-3 px-4">
        <AlertsCard
          tier={tier}
          enabled={alerts}
          next={areaHref}
          lead={lead}
          upcoming={
            nextHere
              ? {
                  day: fmtRelativeDay(nextHere.date, today),
                  window: fmtWindow(nextHere.start_time, nextHere.end_time),
                  area: placeLabel(place.district, place.sector),
                }
              : null
          }
        />
      </div>

      {/* -------------------------------------------------- what this means */}
      <Section title={t.areaPrepare}>
        <div className="rounded-card border border-line bg-surface">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <span aria-hidden className="text-[14px] text-ask">
              {PROFILE_META[profile].glyph}
            </span>
            <span className="text-[13px] font-medium">
              {lang === "rw" ? PROFILE_META[profile].labelRw : PROFILE_META[profile].label}
            </span>
          </div>
          <div className="flex flex-col divide-y divide-line">
            {prepRows(profile, {
              fridgeHours,
              freezerFull: foodSafety.freezer_full.safe_hours_unopened,
              typical: history.medianDurationMinutes,
              typicalHour: history.typicalHour,
              longest,
              overFridge,
              count365d: history.count365d,
              n: history.durationSampleSize,
            }).map((row) => (
              <div key={row.k} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <span className="text-[12.5px] text-muted">{row.k}</span>
                <span className="tnum shrink-0 text-[13.5px] font-medium">{row.v}</span>
              </div>
            ))}
          </div>
          <p className="border-t border-line px-4 py-3 text-[11.5px] leading-relaxed text-faint">
            {lang === "rw" ? foodSafety.rules[0].rw : foodSafety.rules[0].en}
          </p>
        </div>
      </Section>

      {/* ------------------------------------------------------- the record */}
      <Section title={t.areaRecord}>
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="tnum text-[30px] font-semibold leading-none tracking-tight">
                {history.n}
              </div>
              <div className="mt-1.5 text-[12px] text-muted">
                {t.outages} · {placeLabel(place.district, place.sector)}
              </div>
            </div>
            <ConfidenceTag confidence={history.confidence} n={history.durationSampleSize} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
            <Stat
              value={fmtDuration(history.medianDurationMinutes)}
              label={t.typicalLength}
              sub={`${history.durationSampleSize} published windows`}
            />
            <Stat value={fmtHour(history.typicalHour)} label={t.usualStart} />
            <Stat value={String(history.count365d)} label={t.lastYear} />
            <Stat value={fmtDuration(longest)} label={t.longest} />
            <Stat value={fmtReason(history.commonReason)} label={t.commonCause} />
            <Stat value={history.feeder ?? "—"} label={t.mainFeeder} />
          </div>

          {history.noEndTimeCount > 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-open/40 px-3 py-2 text-[11.5px] leading-relaxed text-open/90">
              {history.noEndTimeCount} of {history.n} {t.noEndPublished}.
            </p>
          ) : null}

          {history.firstSeen && history.lastSeen ? (
            <p className="mt-4 text-[11.5px] text-faint">
              {t.firstRecord} {fmtDate(history.firstSeen)} · {t.latestRecord}{" "}
              {fmtDate(history.lastSeen)}
            </p>
          ) : null}
        </div>
      </Section>

      {/* ---------------------------------------------------------- history */}
      <Section title={`${t.areaHistory} · ${t.perMonth}`}>
        <div className="rounded-card border border-line bg-surface px-4 pb-3 pt-4">
          <Sparkbars buckets={months} color={meta.color} />
        </div>
      </Section>

      {/* ------------------------------------------------------- coming up */}
      <Section title={t.areaUpcoming}>
        {upcomingHere.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-4 text-[12.5px] leading-relaxed text-muted">
            {t.areaNothingUpcoming}
          </p>
        ) : (
          <div className="divide-y divide-line rounded-card border border-line bg-surface">
            {upcomingHere.map((o) => (
              <RecordRow
                key={o.outage_id}
                record={recordFields(o)}
                left={fmtRelativeDay(o.date, today)}
                right={fmtWindow(o.start_time, o.end_time)}
                sub={o.reason_raw}
                tone="var(--color-timed)"
              />
            ))}
          </div>
        )}
      </Section>

      {/* ----------------------------------------------------- past records */}
      <Section title={t.areaRecent}>
        {past.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-4 text-[12.5px] text-muted">
            {t.areaNoRecords}
          </p>
        ) : (
          <div className="divide-y divide-line rounded-card border border-line bg-surface">
            {past.map((o) => (
              <RecordRow
                key={o.outage_id}
                record={recordFields(o)}
                left={fmtDayDate(o.date)}
                right={o.duration_minutes ? fmtDuration(o.duration_minutes) : "no end"}
                sub={o.reason_raw}
                tone={o.end_time ? "var(--color-faint)" : "var(--color-open)"}
              />
            ))}
          </div>
        )}
      </Section>

      {/* -------------------------------------------------------- nationwide */}
      <Section title={t.areaNationwide}>
        <div className="divide-y divide-line rounded-card border border-line bg-surface">
          {national.length === 0 ? (
            <p className="px-4 py-4 text-[12.5px] text-muted">{t.areaNothingUpcoming}</p>
          ) : (
            national.map((g) => (
              <div key={g.key} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] font-medium">
                    {fmtRelativeDay(g.date, today)}
                  </span>
                  <span className="tnum shrink-0 text-[12px] text-muted">
                    {fmtWindow(g.startTime, g.endTime)}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
                  {g.districts.join(" · ")} — {g.areaCount} area{g.areaCount === 1 ? "" : "s"}
                </p>
              </div>
            ))
          )}
        </div>
      </Section>

      <div className="mt-8 px-4">
        <Link
          href={chatHref}
          className="grid min-h-[52px] place-items-center rounded-full bg-ask text-[15px] font-semibold text-black transition active:scale-[0.98]"
        >
          {t.askAssistant}
        </Link>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- pieces */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 px-4">
      <h2 className="px-1 pb-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

function nowLabel(now: Date): string {
  const shifted = new Date(now.getTime() + 120 * 60_000);
  return `${String(shifted.getUTCHours()).padStart(2, "0")}:${String(
    shifted.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * The profile panel. Thresholds come from data/food_safety.json and durations
 * from the REG records -- nothing on this screen is generated.
 */
function prepRows(
  profile: Profile,
  d: {
    fridgeHours: number;
    freezerFull: number;
    typical: number | null;
    typicalHour: number | null;
    longest: number | null;
    overFridge: number;
    count365d: number;
    n: number;
  },
): { k: string; v: string }[] {
  const typical = `${fmtDuration(d.typical)}${d.n < 5 ? " (weak)" : ""}`;

  if (profile === "household") {
    return [
      { k: "Unopened fridge holds", v: `${d.fridgeHours}h` },
      { k: "Full freezer holds", v: `${d.freezerFull}h` },
      { k: "Typical outage here", v: typical },
      { k: `Published outages over ${d.fridgeHours}h`, v: String(d.overFridge) },
    ];
  }
  if (profile === "shop_owner") {
    return [
      { k: "Cold stock safe for", v: `${d.fridgeHours}h fridge · ${d.freezerFull}h freezer` },
      { k: "Typical outage here", v: typical },
      { k: "Longest published here", v: fmtDuration(d.longest) },
      { k: `Runs over ${d.fridgeHours}h`, v: String(d.overFridge) },
    ];
  }
  return [
    { k: "Typical outage here", v: typical },
    { k: "Usual start time", v: fmtHour(d.typicalHour) },
    { k: "Outages in the last year", v: String(d.count365d) },
    { k: "Longest published here", v: fmtDuration(d.longest) },
  ];
}
