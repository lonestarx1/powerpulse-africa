/**
 * The help screen. A thin server shell around the client thread: it resolves
 * the profile, the confirmed place, the language and the clock, then hands
 * them to <Chat/> as plain props.
 *
 * Nothing on this route imports lib/outages.ts into the client -- that module
 * carries 2.5MB of committed JSON.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { LangToggle, Wordmark } from "@/components/chrome";
import { LockedCard } from "@/components/paywall";
import { copyFor } from "@/lib/i18n";
import { kigaliNow } from "@/lib/outages";
import { readPrefs } from "@/lib/prefs";
import { PROFILE_META, fmtDayDate, parseAt, placeLabel } from "@/lib/ui";

type Params = { [key: string]: string | string[] | undefined };

export default async function ChatPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { profile, place, lang, tier } = await readPrefs();
  if (!profile) redirect("/start");
  if (!place) redirect("/location");

  const t = copyFor(lang);
  const at = typeof params.at === "string" ? params.at : undefined;
  const pinned = parseAt(params.at);
  const now = pinned ?? new Date();
  const areaHref = at ? `/area?at=${encodeURIComponent(at)}` : "/area";

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 pb-3 pt-4">
        <Link
          href={areaHref}
          className="-ml-1 flex min-h-[32px] items-center gap-1 px-1 text-[13px] text-muted transition active:scale-[0.97]"
        >
          <span aria-hidden>‹</span> {t.back}
        </Link>

        <div className="min-w-0 text-center">
          <p className="truncate text-[13px] font-semibold tracking-tight">{t.chatTitle}</p>
          <p className="truncate text-[11px] text-faint">
            {placeLabel(place.district, place.sector)}
          </p>
        </div>

        <LangToggle lang={lang} next={at ? `/chat?at=${encodeURIComponent(at)}` : "/chat"} />
      </header>

      {pinned ? (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-full border border-dashed border-ask/40 bg-ask/5 px-3 py-1.5">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ask" />
          <span className="text-[11.5px] leading-tight text-ask/90">
            Showing {fmtDayDate(kigaliNow(now).date)}
          </span>
        </div>
      ) : null}

      {tier === "pro" ? (
        <Chat
          profile={profile}
          place={place}
          lang={lang}
          nowISO={now.toISOString()}
          pinned={pinned !== null}
        />
      ) : (
        <div className="px-4 pb-8 pt-5">
          <LockedCard
            title="Advice written for your situation"
            body={`The record for ${placeLabel(
              place.district,
              place.sector,
            )} is free and it is all on the previous screen. What Pro adds is someone reading it for you — advice that changes with the actual outage length and with the fact that you are a ${PROFILE_META[
              profile
            ].label.toLowerCase()}.`}
            bullets={[
              "Answers in Kinyarwanda or English, from this area's record only",
              "Food and cold-stock calls tied to the published outage length",
              "Tells you which part of its own answer is weakest",
              "Says “I don’t know” instead of inventing a restoration time",
            ]}
            cta="Unlock the assistant"
            next={at ? `/chat?at=${encodeURIComponent(at)}` : "/chat"}
            sample={<SampleAnswer />}
          />

          <Link
            href={areaHref}
            className="mt-3 grid min-h-[46px] place-items-center rounded-full border border-line bg-surface text-[14px] text-muted transition active:scale-[0.98]"
          >
            Back to the free record
          </Link>
        </div>
      )}

      <div className="sr-only">
        <Wordmark />
      </div>
    </main>
  );
}

/**
 * A real answer the system produced for a real record, shown so someone can
 * judge whether it is worth paying for. Labelled as an example by LockedCard,
 * and about a different area on purpose -- we are not going to imply we have
 * already computed something for you that you cannot see.
 */
function SampleAnswer() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="px-3.5 py-3">
        <p className="text-[12.5px] font-medium leading-snug">
          Power in Kinyinya is out for planned maintenance on the Utexrwa feeder.
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
          REG published a restoration time of 14:00 — about 75 minutes from now.
        </p>
        <ul className="mt-3 space-y-2">
          {[
            "Keep the fridge shut. Two hours will not spoil your cold stock — an unopened fridge holds for four.",
            "Do not start the generator for this. The fuel costs more than the stock is at risk of.",
            "Tell customers power is expected back at 14:00.",
          ].map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden className="mt-[6px] size-1 shrink-0 rounded-full bg-ask/80" />
              <span className="text-[12px] leading-relaxed text-muted">{line}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="border-t border-line px-3.5 py-2 font-mono text-[10px] text-faint">
        REG, planned outage, 05 Aug 2026
      </p>
    </div>
  );
}
