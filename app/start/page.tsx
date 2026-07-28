/**
 * Step 1 of 2: who are you.
 *
 * We ask for the profile before the location because it is the one thing we
 * genuinely cannot infer, and because it is what makes the advice different
 * from a lookup table. No account, no permissions, nothing to skip past.
 */

import { chooseProfile } from "@/app/actions";
import { StepHeader } from "@/components/chrome";
import { copyFor } from "@/lib/i18n";
import { readPrefs } from "@/lib/prefs";
import { PROFILES, PROFILE_META } from "@/lib/ui";

export default async function StartPage() {
  const { lang } = await readPrefs();
  const t = copyFor(lang);

  return (
    <main className="flex flex-1 flex-col pb-10">
      <StepHeader lang={lang} step={1} total={2} backHref="/" next="/start" />

      <div className="px-5 pt-8">
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-tight">{t.whoTitle}</h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{t.whoSub}</p>

        <form action={chooseProfile} className="mt-7 flex flex-col gap-3">
          <input type="hidden" name="next" value="/location" />

          {PROFILES.map((p) => {
            const meta = PROFILE_META[p];
            return (
              <button
                key={p}
                type="submit"
                name="profile"
                value={p}
                className="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-4 text-left transition hover:border-ask/40 active:scale-[0.985]"
              >
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-2xl bg-raised text-[17px] text-ask"
                >
                  {meta.glyph}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">
                    {lang === "rw" ? meta.labelRw : meta.label}
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {lang === "rw" ? meta.label : meta.blurb}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-faint">
                  ›
                </span>
              </button>
            );
          })}
        </form>

        <ul className="mt-7 flex flex-col gap-2">
          {PROFILES.map((p) => (
            <li key={p} className="flex gap-2.5 text-[11.5px] leading-relaxed text-faint">
              <span aria-hidden className="mt-[6px] size-1 shrink-0 rounded-full bg-line" />
              <span>
                <span className="text-muted">{PROFILE_META[p].label}:</span>{" "}
                {PROFILE_META[p].focus.join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
