"use client";

/**
 * The location step, filtering as you type.
 *
 * The whole place index -- about a thousand (district, sector) pairs, ~40KB --
 * is handed to the browser, so every keystroke filters locally. A round trip
 * per keystroke would be unusable on the connections this product is for, and
 * the alternative (search only on submit) made people tap a button to find out
 * their sector was spelled differently in the listing.
 *
 * Two rules the interaction keeps:
 *
 *   1. Filtering never picks for you. Narrowing the list is not a decision;
 *      you still tap the place, and what you tap is the exact (district,
 *      sector) pair we store. 198 sector names appear in more than one
 *      district, so a confident guess here would be the worst bug we could
 *      ship.
 *   2. It still works with JavaScript off. The field is a real GET form
 *      pointed at /location, and this component is server-rendered from
 *      `initialQuery`, so submitting produces the same filtered list. The
 *      Find button is only there until JS takes over.
 *
 * The index arrives here as plain PlaceOption values -- never anything from
 * lib/outages, which imports 2.5MB of records and must not reach the browser.
 */

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { choosePlace } from "@/app/actions";
import { copyFor, type Lang } from "@/lib/i18n";
import {
  encodePlace,
  filterPlaces,
  normQuery,
  placeLabel,
  type PlaceOption,
} from "@/lib/ui";

/* ------------------------------------------------------------------ pieces */

function FilterField({
  value,
  onChange,
  placeholder,
  live,
  findLabel,
  clearLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  live: boolean;
  findLabel: string;
  clearLabel: string;
}) {
  return (
    <form
      method="GET"
      action="/location"
      // With JS the list is already filtered, so Enter has nothing to submit.
      onSubmit={(e) => e.preventDefault()}
      className="flex items-center gap-2"
    >
      <div className="relative flex-1">
        <input
          type="search"
          name="find"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label={placeholder}
          className="min-h-[46px] w-full rounded-full border border-line bg-surface pl-4 pr-11 text-[14px] outline-none placeholder:text-faint focus:border-ask/50 [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={clearLabel}
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-faint transition hover:bg-raised hover:text-text"
          >
            <span aria-hidden className="text-[15px] leading-none">
              ×
            </span>
          </button>
        ) : null}
      </div>

      {live ? null : (
        <button
          type="submit"
          className="min-h-[46px] shrink-0 rounded-full border border-line bg-raised px-4 text-[13px] transition active:scale-[0.97]"
        >
          {findLabel}
        </button>
      )}
    </form>
  );
}

/** A row that commits a place and moves on to the dashboard. */
function PlaceButton({
  district,
  sector,
  label,
  meta,
  query = "",
}: {
  district: string;
  sector: string | null;
  label: string;
  meta: string;
  query?: string;
}) {
  return (
    <button
      type="submit"
      name="place"
      value={encodePlace(district, sector)}
      className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 text-left transition hover:border-ask/40 active:scale-[0.985]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium">
          <Highlight text={label} query={query} />
        </span>
        <span className="tnum block text-[11.5px] text-faint">{meta}</span>
      </span>
      <span aria-hidden className="shrink-0 text-faint">
        ›
      </span>
    </button>
  );
}

function NoMatch({ text }: { text: string }) {
  return (
    <p className="rounded-card border border-dashed border-line px-4 py-4 text-[13px] leading-relaxed text-muted">
      {text}
    </p>
  );
}

/** Marks the run of `query` inside a name, so it is obvious why a row matched. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = normQuery(query);
  if (!q) return <>{text}</>;

  // Walk the raw text and the normalised text together: normalisation drops
  // accents and punctuation, so offsets only line up if we count as we go.
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const piece = normQuery(text[i]);
    for (let k = 0; k < piece.length; k++) map.push(i);
    norm += piece;
  }

  const at = norm.indexOf(q);
  if (at === -1) return <>{text}</>;

  const start = map[at];
  const end = at + q.length < map.length ? map[at + q.length] : text.length;

  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-transparent text-ask">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

/**
 * False on the server and through hydration, true once React is driving.
 * Everything the no-JS path needs -- the Find button -- has to be in the
 * server HTML, and can go the moment typing actually filters.
 */
const noopSubscribe = () => () => {};

function useLive(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* --------------------------------------------------------------- districts */

export function DistrictPicker({
  lang,
  districts,
  options,
  initialQuery = "",
}: {
  lang: Lang;
  districts: { district: string; count: number }[];
  options: PlaceOption[];
  initialQuery?: string;
}) {
  const t = copyFor(lang);
  const live = useLive();
  const [query, setQuery] = useState(initialQuery);

  const matches = useMemo(() => filterPlaces(options, query, 14), [options, query]);
  const searching = normQuery(query).length > 0;

  return (
    <>
      <div className="mt-5">
        <FilterField
          value={query}
          onChange={setQuery}
          placeholder={t.searchPlaceholder}
          live={live}
          findLabel={t.find}
          clearLabel={t.clearSearch}
        />
      </div>

      <div className="mt-6">
        {searching ? (
          matches.length === 0 ? (
            <NoMatch text={t.noMatch} />
          ) : (
            <form action={choosePlace} className="flex flex-col gap-2">
              <input type="hidden" name="next" value="/area" />
              {matches.map((p) => (
                <PlaceButton
                  key={encodePlace(p.district, p.sector)}
                  district={p.district}
                  sector={p.sector}
                  label={placeLabel(p.district, p.sector)}
                  query={query}
                  meta={`${p.count} ${t.records}`}
                />
              ))}
            </form>
          )
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {districts.map((d) => (
              <Link
                key={d.district}
                href={`/location?district=${encodeURIComponent(d.district)}`}
                className="flex min-h-[64px] flex-col justify-center rounded-2xl border border-line bg-surface px-3.5 py-3 transition hover:border-ask/40 active:scale-[0.98]"
              >
                <span className="truncate text-[14px] font-medium">{d.district}</span>
                <span className="tnum text-[11px] text-faint">
                  {d.count} {t.records}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- sectors */

export function SectorPicker({
  lang,
  district,
  sectors,
}: {
  lang: Lang;
  district: string;
  sectors: { sector: string | null; count: number }[];
}) {
  const t = copyFor(lang);
  const live = useLive();
  const [query, setQuery] = useState("");

  const q = normQuery(query);
  const shown = useMemo(() => {
    if (!q) return sectors;
    // The district-wide row has no sector name of its own, so it answers to
    // the district's.
    const districtMatches = normQuery(district).includes(q);
    return sectors.filter((s) =>
      s.sector === null ? districtMatches : normQuery(s.sector).includes(q),
    );
  }, [sectors, district, q]);

  // 83 sectors in Nyarugenge alone -- worth a filter; six is not.
  const filterable = sectors.length > 8;

  return (
    <>
      {filterable ? (
        <div className="mt-5">
          <FilterField
            value={query}
            onChange={setQuery}
            placeholder={t.sectorPlaceholder}
            live={live}
            findLabel={t.find}
            clearLabel={t.clearSearch}
          />
        </div>
      ) : null}

      <div className="mt-6">
        {shown.length === 0 ? (
          <NoMatch text={t.noMatch} />
        ) : (
          <form action={choosePlace} className="flex flex-col gap-2">
            <input type="hidden" name="next" value="/area" />
            {shown.map((s) => (
              <PlaceButton
                key={s.sector ?? "*"}
                district={district}
                sector={s.sector}
                label={s.sector ?? t.wholeDistrict}
                query={query}
                meta={`${s.count} ${t.records}${s.sector === null ? " · district-wide" : ""}`}
              />
            ))}
          </form>
        )}
      </div>
    </>
  );
}
