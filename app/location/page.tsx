/**
 * Step 2 of 2: where are you. District first, then sector.
 *
 * Two taps rather than one free-text box, because sector names are not unique:
 * 198 of them appear in more than one district in the REG data, and seven
 * collide with district names outright. Carrying the district is the only way
 * to be sure, and a confidently wrong location is the worst failure this
 * product has.
 *
 * The search box is a shortcut, not a replacement -- it filters as you type,
 * but it still resolves to a (district, sector) pair the user confirms by
 * tapping. Filtering is a client component holding the ~40KB place index;
 * see components/place-picker.tsx.
 */

import { redirect } from "next/navigation";
import { StepHeader } from "@/components/chrome";
import { DistrictPicker, SectorPicker } from "@/components/place-picker";
import { allDistricts, placeOptions, sectorsIn } from "@/lib/dashboard";
import { copyFor } from "@/lib/i18n";
import { readPrefs } from "@/lib/prefs";

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
  // Only set when the field was submitted without JavaScript; the client
  // component owns the query from then on.
  const find = one(params.find)?.trim() ?? "";

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
          <>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12px]">
              <span aria-hidden className="size-1.5 rounded-full bg-ask" />
              {district}
            </p>
            <SectorPicker lang={lang} district={district} sectors={sectorsIn(district)} />
          </>
        ) : (
          <DistrictPicker
            lang={lang}
            districts={allDistricts()}
            options={placeOptions()}
            initialQuery={find}
          />
        )}
      </div>
    </main>
  );
}
