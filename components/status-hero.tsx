/**
 * The hero: the whole answer to "is my power out, and for how long", in one
 * glance, before any text is read.
 *
 * Server component. The facts here are computed from the utility's published
 * records and never wait on a model -- if Gemini is down, this still renders
 * and still answers the question.
 */

import Link from "next/link";
import type { Live, Outage } from "@/lib/outages";
import {
  STATE_META,
  fmtDayDate,
  fmtDuration,
  fmtRelativeDay,
  fmtWindow,
  instantOf,
  placeLabel,
  stateOf,
} from "@/lib/ui";
import { Countdown, ClearMark, Elapsed } from "./countdown";
import { RecordSheet, type RecordFields } from "./record-sheet";

export function recordFields(o: Outage): RecordFields {
  return {
    date: fmtDayDate(o.date),
    window: fmtWindow(o.start_time, o.end_time),
    district: o.district,
    areas: o.sector_areas_raw || o.sector,
    reason: o.reason_raw,
    status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
    feeder: o.feeder,
    page: o.page_number,
    sourceUrl: o.source_url,
    inferred: o.district_inferred,
  };
}

function kindOf(o: Outage): string {
  if (o.reason_category === "fault") return "Unplanned fault";
  if (o.status === "planned") return "Planned work";
  if (o.reason_category === "maintenance") return "Maintenance";
  if (o.reason_category === "extension") return "Extension work";
  return "Outage";
}

export function StatusHero({
  district,
  sector,
  live,
  nowISO,
  todayISO,
  changeHref,
}: {
  district: string;
  sector: string | null;
  live: Live;
  nowISO: string;
  todayISO: string;
  /** Where the place chip goes when tapped. */
  changeHref: string;
}) {
  const state = stateOf(live);
  const meta = STATE_META[state];
  const active = live.active;

  return (
    <div className="relative overflow-hidden">
      <div
        className="glow pointer-events-none absolute inset-x-0 -top-10 h-72"
        style={{ ["--glow-color" as string]: meta.color }}
        aria-hidden
      />

      <div className="relative flex flex-col items-center px-4 pt-3">
        <Link
          href={changeHref}
          className="flex max-w-full items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-2 text-[13px] transition active:scale-[0.98]"
        >
          <span
            aria-hidden
            className="inline-block size-2 shrink-0 rounded-full"
            style={{ background: meta.color }}
          />
          <span className="truncate font-medium">{placeLabel(district, sector)}</span>
          <span className="shrink-0 text-faint">change</span>
        </Link>

        <div className="mt-5">
          {state === "timed" && active ? (
            <Countdown
              startISO={instantOf(active.date, active.start_time) ?? nowISO}
              endISO={instantOf(active.date, active.end_time)!}
              nowISO={nowISO}
              color={meta.color}
            />
          ) : state === "open" && active ? (
            <Elapsed
              startISO={instantOf(active.date, active.start_time) ?? nowISO}
              nowISO={nowISO}
              color={meta.color}
            />
          ) : (
            <ClearMark color={meta.color} />
          )}
        </div>

        <h1
          className="mt-5 text-center text-[30px] font-semibold leading-[1.1] tracking-tight"
          style={{ color: state === "clear" ? undefined : meta.color }}
        >
          {state === "clear" ? "No outage published" : "Power is out"}
        </h1>

        <p className="mt-2 max-w-[19rem] text-center text-[14px] leading-snug text-muted">
          {state === "timed" && active ? (
            <>
              {kindOf(active)} · back at <span className="tnum text-text">{active.end_time}</span>
            </>
          ) : state === "open" && active ? (
            <>
              {kindOf(active)}.{" "}
              <span className="text-open/90">The utility has not published an end time.</span>
            </>
          ) : live.next ? (
            <>
              Next scheduled: {fmtRelativeDay(live.next.date, todayISO)},{" "}
              <span className="tnum text-text">
                {fmtWindow(live.next.start_time, live.next.end_time)}
              </span>
            </>
          ) : (
            <>Nothing scheduled for this area in the published listing.</>
          )}
        </p>

        {state === "timed" && active?.duration_minutes ? (
          <p className="mt-1.5 text-[12px] text-faint">
            Published window {fmtDuration(active.duration_minutes)} ·{" "}
            {fmtWindow(active.start_time, active.end_time)}
          </p>
        ) : null}

        <div className="mt-5 w-full">
          {active ? (
            <RecordSheet
              label={`REG · ${active.status} · ${fmtDayDate(active.date)}`}
              record={recordFields(active)}
              tone={meta.color}
            />
          ) : live.next ? (
            <RecordSheet
              label={`REG · next · ${fmtDayDate(live.next.date)}`}
              record={recordFields(live.next)}
              tone={meta.color}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * The no-ETA callout. Rendered as a designed, deliberate statement rather
 * than an error, because saying "I don't know" is the feature.
 */
export function NoEtaNote({ noEndTimeCount, n }: { noEndTimeCount: number; n: number }) {
  return (
    <div className="rounded-card border border-dashed border-open/40 bg-open/5 px-4 py-3">
      <p className="text-[13px] font-medium text-open/95">No restoration time to give you.</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        The utility published a start and no end for this outage, so we will not put a number on
        it. {noEndTimeCount > 0 ? (
          <>
            {noEndTimeCount} of the {n} records for this area were published the same way.
          </>
        ) : null}
      </p>
    </div>
  );
}
