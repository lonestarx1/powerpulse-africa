"use client";

/**
 * Provenance, one tap from the claim.
 *
 * Every fact on the status card can be traced to a row the utility published.
 * The sheet shows that row as scraped -- not a summary of it -- plus the URL
 * it came from, so a judge (or a user) can check us against the source.
 */

import { useEffect, useState } from "react";
import { RawRow } from "./bits";

export type RecordFields = {
  date: string;
  window: string;
  district: string;
  areas: string;
  reason: string;
  status: string;
  feeder: string | null;
  page: number | null;
  sourceUrl: string | null;
  /** Set when the REG row named several districts and the parser had to pick. */
  inferred: boolean;
};

/** A row in the history list. Same sheet, different trigger. */
export function RecordRow({
  record,
  left,
  right,
  sub,
  tone,
}: {
  record: RecordFields;
  left: string;
  right: string;
  sub: string;
  tone: string;
}) {
  return (
    <Sheet
      record={record}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-raised"
        >
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: tone }}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13.5px] font-medium">{left}</span>
              <span className="tnum shrink-0 text-[12px] text-muted">{right}</span>
            </span>
            <span className="mt-0.5 block truncate text-[11.5px] text-faint">{sub}</span>
          </span>
        </button>
      )}
    />
  );
}

export function RecordSheet({
  label,
  record,
  tone,
}: {
  label: string;
  record: RecordFields;
  tone: string;
}) {
  return (
    <Sheet
      record={record}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="flex w-full items-center justify-between gap-3 rounded-full border border-line bg-raised px-3.5 py-2.5 text-left transition active:scale-[0.98]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="inline-block size-1.5 shrink-0 rounded-full"
              style={{ background: tone }}
            />
            <span className="truncate text-[12.5px] text-muted">{label}</span>
          </span>
          <span className="shrink-0 text-[12px] text-faint">Show the record ›</span>
        </button>
      )}
    />
  );
}

function Sheet({
  record,
  trigger,
}: {
  record: RecordFields;
  trigger: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {trigger(() => setOpen(true))}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="The published record"
            onClick={(e) => e.stopPropagation()}
            className="rise w-full max-w-[440px] rounded-t-[24px] border-t border-line bg-surface px-5 pt-4 safe-b"
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <div className="flex items-baseline justify-between">
              <h3 className="text-[15px] font-semibold">The record this came from</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-2 px-2 py-1 text-[13px] text-muted"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-faint">
              Scraped from the utility&rsquo;s public outage listing. Shown as published — we
              have not rewritten it.
            </p>

            <dl className="mt-3 divide-y divide-line border-y border-line">
              <RawRow k="Date" v={record.date} />
              <RawRow k="Time" v={record.window} />
              <RawRow k="District" v={record.district} />
              <RawRow k="Sector / Areas" v={record.areas} />
              <RawRow k="Reason" v={record.reason} />
              <RawRow k="Status" v={record.status} />
              {record.feeder ? <RawRow k="Feeder" v={record.feeder} /> : null}
              {record.page ? <RawRow k="Listing page" v={String(record.page)} /> : null}
            </dl>

            {record.inferred ? (
              <p className="mt-3 rounded-xl border border-dashed border-open/40 px-3 py-2 text-[11.5px] leading-relaxed text-open/90">
                This REG row named several districts at once. We assigned this area by parsing
                the text, so the district on this record is inferred rather than stated.
              </p>
            ) : null}

            {record.sourceUrl ? (
              <a
                href={record.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-full border border-line bg-raised py-3 text-[13px] font-medium transition active:scale-[0.98]"
              >
                Open the source listing ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
