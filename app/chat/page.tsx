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
import { copyFor } from "@/lib/i18n";
import { readPrefs } from "@/lib/prefs";
import { parseAt, placeLabel } from "@/lib/ui";

type Params = { [key: string]: string | string[] | undefined };

export default async function ChatPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { profile, place, lang } = await readPrefs();
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
            Clock pinned for this demo
          </span>
        </div>
      ) : null}

      <Chat
        profile={profile}
        place={place}
        lang={lang}
        nowISO={now.toISOString()}
        pinned={pinned !== null}
      />

      <div className="sr-only">
        <Wordmark />
      </div>
    </main>
  );
}
