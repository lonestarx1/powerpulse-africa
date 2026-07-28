/**
 * Landing. The first thing a judge opens and the first thing a user opens.
 *
 * Every number on this page is read out of the committed REG dataset at render
 * time rather than typed into the copy, so the pitch cannot drift away from
 * what we actually shipped.
 *
 * Server component: no JavaScript is needed to read any of it.
 */

import Link from "next/link";
import { AccountChip, LangToggle, Wordmark } from "@/components/chrome";
import { copyFor } from "@/lib/i18n";
import { dataset, outages } from "@/lib/outages";
import { readPrefs } from "@/lib/prefs";
import { datasetSummary } from "@/lib/stats";
import { FREE_FEATURES, PRICE } from "@/lib/tier";
import { fmtDateLong, placeLabel } from "@/lib/ui";

export default async function Landing() {
  const { profile, place, lang, user } = await readPrefs();
  const t = copyFor(lang);
  const resuming = profile !== null && place !== null;
  const summary = datasetSummary(outages);

  return (
    <main className="flex flex-1 flex-col">
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden px-5 pb-10 pt-5">
        <div
          className="glow pointer-events-none absolute inset-x-0 -top-28 h-96"
          style={{ ["--glow-color" as string]: "var(--color-timed)" }}
          aria-hidden
        />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <Wordmark />
            <div className="flex items-center gap-2">
              <LangToggle lang={lang} next="/" />
              <AccountChip user={user} next="/" />
            </div>
          </div>

          <h1 className="mt-10 text-[34px] font-semibold leading-[1.08] tracking-[-0.02em]">
            {t.heroA}
            <span className="block text-muted">{t.heroB}</span>
          </h1>

          <p className="mt-4 text-[15px] leading-relaxed text-muted">{t.heroBody}</p>

          <div className="mt-7 flex flex-col gap-2.5">
            <Link
              href={resuming ? "/area" : "/start"}
              className="grid min-h-[52px] place-items-center rounded-full bg-ask px-4 text-center text-[15px] font-semibold text-black transition active:scale-[0.98]"
            >
              {resuming ? placeLabel(place.district, place.sector) : t.getStarted}
            </Link>
            {resuming ? (
              <Link
                href="/start"
                className="grid min-h-[46px] place-items-center rounded-full border border-line bg-surface text-[14px] text-muted transition active:scale-[0.98]"
              >
                {t.startOver}
              </Link>
            ) : (
              <p className="text-center text-[12px] text-faint">{t.noAccount}</p>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- product preview */}
      <section className="px-5">
        <Preview />
      </section>

      {/* ---------------------------------------------------------- states */}
      <section className="px-5 pt-12">
        <SectionTitle>{t.statesTitle}</SectionTitle>
        <div className="mt-4 flex flex-col gap-2.5">
          <StateRow color="var(--color-timed)" title={t.stateTimed} body={t.stateTimedBody} />
          <StateRow color="var(--color-open)" title={t.stateOpen} body={t.stateOpenBody} dashed />
          <StateRow color="var(--color-clear)" title={t.stateClear} body={t.stateClearBody} />
        </div>
      </section>

      {/* ------------------------------------------------------------ steps */}
      <section className="px-5 pt-12">
        <SectionTitle>{t.howTitle}</SectionTitle>
        <ol className="mt-4 flex flex-col gap-3.5">
          <Step n={1} title={t.step1} body={t.step1Body} />
          <Step n={2} title={t.step2} body={t.step2Body} />
          <Step n={3} title={t.step3} body={t.step3Body} />
          <Step n={4} title={t.step4} body={t.step4Body} />
        </ol>
      </section>

      {/* ------------------------------------------------------------- data */}
      <section className="px-5 pt-12">
        <div className="rounded-card border border-line bg-surface p-5">
          <SectionTitle>{t.dataTitle}</SectionTitle>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
            <Figure value={dataset.raw_row_count.toLocaleString()} label={t.dataNotices} />
            <Figure value={summary.records.toLocaleString()} label={t.dataRecords} />
            <Figure value={String(summary.districts)} label={t.dataDistricts} />
            <Figure value={summary.sectors.toLocaleString()} label={t.dataSectors} />
          </div>
          <p className="mt-5 text-[12.5px] leading-relaxed text-muted">
            {summary.from ? fmtDateLong(summary.from) : "—"} — {summary.to ? fmtDateLong(summary.to) : "—"}
            , {t.dataBody}
          </p>
          {dataset.source_url ? (
            <a
              href={dataset.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex min-h-[44px] items-center justify-center rounded-full border border-line bg-raised px-4 text-center text-[13px] transition active:scale-[0.98]"
            >
              {t.openSource}
            </a>
          ) : null}
        </div>
      </section>

      {/* ---------------------------------------------------------- honesty */}
      <section className="px-5 pt-12">
        <div className="rounded-card border border-dashed border-open/40 bg-open/5 p-5">
          <h2 className="text-[18px] font-semibold leading-snug tracking-tight text-open/95">
            {t.honestTitle}
          </h2>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">{t.honestBody}</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-[12.5px] leading-relaxed text-muted">
            <Rule>{t.honestWeak}</Rule>
            <Rule>{t.honestFood}</Rule>
            <Rule>{t.honestAsk}</Rule>
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- pricing */}
      <section className="px-5 pt-12">
        <SectionTitle>Free, and Pro</SectionTitle>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          Everything the utility published is free for everyone, forever — the live status, the
          full history for your area, and the raw record behind every number. Pro is the two
          things that cost us something per person: advice written for your situation, and being
          told before the power goes rather than after.
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          <div className="rounded-card border border-line bg-surface px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-medium">Free</span>
              <span className="text-[12px] text-faint">no account</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              {FREE_FEATURES.slice(0, 3).join(" · ")}
            </p>
          </div>

          <div className="rounded-card border border-timed/35 bg-surface px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-medium text-timed">Pro</span>
              <span className="tnum text-[12.5px]">
                <span className="font-semibold">{PRICE.display}</span>
                <span className="text-muted">/{PRICE.period}</span>
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              Customised advice · pre-outage alerts · {PRICE.rails.join(" / ")}
            </p>
          </div>
        </div>

        <Link
          href="/upgrade"
          className="mt-3 grid min-h-[44px] place-items-center rounded-full border border-line bg-surface text-[13px] text-muted transition active:scale-[0.98]"
        >
          Compare the plans
        </Link>
      </section>

      {/* ------------------------------------------------------------- foot */}
      <section className="mt-auto px-5 pb-10 pt-12">
        <Link
          href={resuming ? "/area" : "/start"}
          className="grid min-h-[52px] place-items-center rounded-full bg-ask text-[15px] font-semibold text-black transition active:scale-[0.98]"
        >
          {resuming ? t.continue : t.getStarted}
        </Link>
        <p className="mt-5 text-center text-[11px] leading-relaxed text-faint">{t.scope}</p>
      </section>
    </main>
  );
}

/* ---------------------------------------------------------------- pieces */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">{children}</h2>
  );
}

/** A still of the real status card, so the product is visible above the fold. */
function Preview() {
  const R = 64;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-surface px-4 pb-5 pt-5">
      <div
        className="glow pointer-events-none absolute inset-x-0 -top-16 h-64"
        style={{ ["--glow-color" as string]: "var(--color-timed)" }}
        aria-hidden
      />
      <div className="relative flex flex-col items-center">
        <span className="flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1.5 text-[11.5px]">
          <span aria-hidden className="size-1.5 rounded-full bg-timed" />
          Kinyinya, Gasabo
        </span>

        <div className="relative mt-4 grid size-[128px] place-items-center">
          <svg viewBox="0 0 160 160" className="absolute size-full -rotate-90">
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--color-line)" strokeWidth="7" />
            <circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="var(--color-timed)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * 0.38}
            />
          </svg>
          <div className="relative text-center">
            <div className="tnum text-[27px] font-semibold leading-none tracking-tight">1:15</div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted">left</div>
          </div>
        </div>

        <p className="mt-4 text-[20px] font-semibold tracking-tight text-timed">Power is out</p>
        <p className="mt-1 text-[12.5px] text-muted">
          Planned work · back at <span className="tnum text-text">14:00</span>
        </p>
        <p className="mt-3 font-mono text-[10px] text-faint">REG · planned · Wed 5 Aug</p>
      </div>
    </div>
  );
}

function StateRow({
  color,
  title,
  body,
  dashed,
}: {
  color: string;
  title: string;
  body: string;
  dashed?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 rounded-card border bg-surface px-4 py-3.5 ${dashed ? "border-dashed" : ""}`}
      style={{ borderColor: `color-mix(in oklab, ${color} 30%, transparent)` }}
    >
      <span
        aria-hidden
        className="mt-[6px] size-2 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium leading-snug">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-3.5">
      <span
        aria-hidden
        className="tnum mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-line bg-surface text-[12px] font-medium text-muted"
      >
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-medium leading-snug">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{body}</p>
      </div>
    </li>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="tnum text-[24px] font-semibold leading-none tracking-tight">{value}</div>
      <div className="mt-1.5 text-[11.5px] leading-snug text-muted">{label}</div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-open/70" />
      <span>{children}</span>
    </li>
  );
}
