/**
 * Step 2 of 2: where are you. District first, then sector.
 *
 * Two taps rather than one free-text box, because sector names are not unique:
 * 198 of them appear in more than one district in the REG data, and seven
 * collide with district names outright. Carrying the district is the only way
 * to be sure, and a confidently wrong location is the worst failure this
 * product has.
 *
 * The search box is a shortcut, not a replacement -- it still resolves to a
 * (district, sector) pair the user confirms by tapping.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { choosePlace } from "@/app/actions";
import { StepHeader } from "@/components/chrome";
import { PlaceSearch } from "@/components/place-picker";
import { allDistricts, findPlaces, sectorsIn } from "@/lib/dashboard";
import { copyFor } from "@/lib/i18n";
import { readPrefs } from "@/lib/prefs";
import { encodePlace, placeLabel } from "@/lib/ui";

type Params = { [key: string]: string | string[] | undefined };

function one(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function LocationPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const { profile, lang } = await readPrefs();
  if (!profile) redirect("/start");

  const t = copyFor(lang);
  const district = one(params.district);
  const find = one(params.find)?.trim() ?? "";

  const matches = find ? findPlaces(find, 14) : [];
  const showSearchResults = find.length > 0;

  return (
    <main className="flex flex-1 flex-col pb-10">
      <StepHeader
        lang={lang}
        step={2}
        total={2}
        backHref={district ? "/location" : "/start"}
        next={district ? `/location?district=${encodeURIComponent(district)}` : "/location"}
      />

      <div className="px-5 pt-8">
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-tight">
          {district ? t.sectorTitle : t.districtTitle}
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
          {district ? t.sectorSub : t.districtSub}
        </p>

        {district ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12px]">
            <span aria-hidden className="size-1.5 rounded-full bg-ask" />
            {district}
          </p>
        ) : (
          <div className="mt-5">
            <PlaceSearch defaultValue={find} lang={lang} />
          </div>
        )}
      </div>

      <div className="mt-6 px-5">
        {/* --------------------------------------------- search shortcut */}
        {showSearchResults ? (
          matches.length === 0 ? (
            <p className="rounded-card border border-dashed border-line px-4 py-4 text-[13px] leading-relaxed text-muted">
              {t.noMatch}
            </p>
          ) : (
            <form action={choosePlace} className="flex flex-col gap-2">
              <input type="hidden" name="next" value="/area" />
              {matches.map((p) => (
                <button
                  key={encodePlace(p.district, p.sector)}
                  type="submit"
                  name="place"
                  value={encodePlace(p.district, p.sector)}
                  className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 text-left transition hover:border-ask/40 active:scale-[0.985]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium">
                      {placeLabel(p.district, p.sector)}
                    </span>
                    <span className="tnum block text-[11.5px] text-faint">
                      {p.count} {t.records}
                    </span>
                  </span>
                  <span aria-hidden className="shrink-0 text-faint">
                    ›
                  </span>
                </button>
              ))}
            </form>
          )
        ) : district ? (
          /* ------------------------------------------------ sector list */
          <form action={choosePlace} className="flex flex-col gap-2">
            <input type="hidden" name="next" value="/area" />
            {sectorsIn(district).map((s) => (
              <button
                key={s.sector ?? "*"}
                type="submit"
                name="place"
                value={encodePlace(district, s.sector)}
                className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 text-left transition hover:border-ask/40 active:scale-[0.985]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium">
                    {s.sector ?? t.wholeDistrict}
                  </span>
                  <span className="tnum block text-[11.5px] text-faint">
                    {s.count} {t.records}
                    {s.sector === null ? " · district-wide" : ""}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-faint">
                  ›
                </span>
              </button>
            ))}
          </form>
        ) : (
          /* ---------------------------------------------- district list */
          <div className="grid grid-cols-2 gap-2">
            {allDistricts().map((d) => (
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
    </main>
  );
}
