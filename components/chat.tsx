"use client";

/**
 * The assistant. A thread, because a follow-up ("what about my fridge?") is a
 * conversation -- while the area screen stays a glanceable state, because
 * "is my power out" is not.
 *
 * This is the only surface in the app that waits on a model. Everything the
 * user needs to decide is already on /area, rendered from the utility's
 * published records, so a slow or dead model degrades this screen and nothing
 * else.
 *
 * Types are redeclared here rather than imported from lib/answer.ts: that
 * module pulls in node:fs and the Google SDK, and importing it from a client
 * component would drag both into the browser bundle.
 */

import { useEffect, useRef, useState } from "react";
import { copyFor, type Lang } from "@/lib/i18n";
import { PROFILE_META, placeLabel, type Profile } from "@/lib/ui";

type Answer = {
  status_line: string;
  duration_line: string;
  advice: string[];
  confidence_note: string;
  source: string;
};

type Candidate = { district: string; sector: string | null; label: string };
type Place = { district: string; sector: string | null };

type Bubble =
  | { from: "user"; text: string }
  | { from: "bot"; kind: "answer"; answer: Answer; place: string }
  | { from: "bot"; kind: "text"; text: string; candidates?: Candidate[] }
  | { from: "bot"; kind: "typing" };

export function Chat({
  profile,
  place,
  lang,
  nowISO,
  pinned,
}: {
  profile: Profile;
  place: Place;
  lang: Lang;
  nowISO: string;
  /** True when ?at= pinned the clock, in which case we forward it. */
  pinned: boolean;
}) {
  const t = copyFor(lang);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bubbles]);

  async function send(text: string, forcedPlace?: Place) {
    const message = text.trim();
    if (!message || busy) return;

    setInput("");
    setBusy(true);
    setBubbles((b) => [...b, { from: "user", text: message }, { from: "bot", kind: "typing" }]);

    try {
      const res = await fetch("/api/advise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          profile,
          language: lang,
          ...(forcedPlace ? { place: forcedPlace } : {}),
          ...(pinned ? { now: nowISO } : {}),
        }),
      });
      const data = await res.json();

      setBubbles((b) => {
        const next = b.filter((x) => !("kind" in x && x.kind === "typing"));
        if (!res.ok) {
          return [...next, { from: "bot", kind: "text", text: data?.error ?? t.failed }];
        }
        if (data.kind === "answer") {
          return [
            ...next,
            {
              from: "bot",
              kind: "answer",
              answer: data.answer,
              place: placeLabel(data.place.district, data.place.sector),
            },
          ];
        }
        return [
          ...next,
          { from: "bot", kind: "text", text: data.message, candidates: data.candidates },
        ];
      });
    } catch {
      setBubbles((b) => [
        ...b.filter((x) => !("kind" in x && x.kind === "typing")),
        { from: "bot", kind: "text", text: t.offline },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const here = placeLabel(place.district, place.sector);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 px-4 pb-4 pt-3">
        {bubbles.length === 0 ? (
          <div className="space-y-2.5 pt-2">
            <div className="rounded-card border border-line bg-surface px-4 py-3.5">
              <p className="text-[13px] leading-relaxed text-muted">
                {t.chatPrompt}
              </p>
              <p className="mt-2 text-[11.5px] text-faint">
                {PROFILE_META[profile].label} · {here}
              </p>
            </div>

            <button
              type="button"
              onClick={() => send(lang === "rw" ? `Nta muriro mu ${here}` : `Power out in ${here}`, place)}
              className="flex w-full items-center gap-3 rounded-card border border-ask/35 bg-ask/10 px-4 py-3.5 text-left transition active:scale-[0.985]"
            >
              <span aria-hidden className="shrink-0 text-ask">
                ✦
              </span>
              <span className="text-[13.5px] font-medium">
                {lang === "rw" ? `Nta muriro mu ${here}` : `Power out in ${here}`}
              </span>
            </button>

            {t.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="block w-full rounded-card border border-line bg-surface px-4 py-3.5 text-left text-[13.5px] text-muted transition active:scale-[0.985]"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {bubbles.map((b, i) =>
          b.from === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="rise max-w-[85%] rounded-[18px] rounded-br-[6px] bg-ask px-3.5 py-2.5 text-[14px] leading-snug text-black">
                {b.text}
              </p>
            </div>
          ) : b.kind === "typing" ? (
            <div key={i} className="flex gap-1.5 px-2 py-3" aria-label="Thinking">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="breathe size-1.5 rounded-full bg-muted"
                  style={{ animationDelay: `${d * 200}ms` }}
                />
              ))}
            </div>
          ) : b.kind === "answer" ? (
            <AnswerCard key={i} answer={b.answer} place={b.place} />
          ) : (
            <div key={i} className="rise max-w-[92%] space-y-2">
              <p className="rounded-[18px] rounded-bl-[6px] border border-ask/30 bg-ask/5 px-3.5 py-2.5 text-[13.5px] leading-relaxed">
                {b.text}
              </p>
              {b.candidates?.length ? (
                <div className="flex flex-wrap gap-2">
                  {b.candidates.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => send(c.label, { district: c.district, sector: c.sector })}
                      className="min-h-[36px] rounded-full border border-ask/40 bg-surface px-3.5 text-[12.5px] text-ask transition active:scale-[0.97]"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-0 z-30 flex items-center gap-2 border-t border-line bg-bg/95 px-3 pt-3 backdrop-blur safe-b"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          enterKeyHint="send"
          aria-label={t.placeholder}
          className="min-h-[46px] w-full flex-1 rounded-full border border-line bg-surface px-4 text-[15px] outline-none placeholder:text-faint focus:border-ask/50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label={t.send}
          className="grid size-[46px] shrink-0 place-items-center rounded-full bg-ask text-black transition active:scale-[0.95] disabled:opacity-35"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}

function AnswerCard({ answer, place }: { answer: Answer; place: string }) {
  return (
    <div className="rise max-w-[95%] overflow-hidden rounded-[18px] rounded-bl-[6px] border border-line bg-surface">
      <div className="border-b border-line px-4 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ask">{place}</p>
      </div>

      <div className="px-4 py-3.5">
        <p className="text-[14px] font-medium leading-snug">{answer.status_line}</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{answer.duration_line}</p>

        <ul className="mt-3.5 space-y-2.5">
          {answer.advice.map((a, i) => (
            <li
              key={i}
              className="rise flex gap-2.5"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ask/80" />
              <span className="text-[13.5px] leading-relaxed">{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* The weakest part of the answer, always shown, never buried. */}
      <div className="border-t border-dashed border-line px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
          Weakest part of this answer
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{answer.confidence_note}</p>
      </div>

      {/* Visible grounding: every answer names the record it came from. */}
      <p className="border-t border-line px-4 py-2.5 font-mono text-[10.5px] leading-relaxed text-faint">
        {answer.source}
      </p>
    </div>
  );
}
