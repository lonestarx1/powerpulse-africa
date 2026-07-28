"use client";

/**
 * The generated half of the answer.
 *
 * Deliberately the *only* part of the screen that waits on a model. The
 * verdict, the clock, the history and the source are already on screen by the
 * time this mounts, so when the model is slow the user is not staring at a
 * skeleton, and when the model fails the product still answered the question.
 *
 * Types are redeclared here rather than imported from lib/answer.ts: that
 * module pulls in node:fs and the Google SDK, and importing it from a client
 * component would drag both into the browser bundle.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { PROFILE_META, PROFILES, type Profile } from "@/lib/ui";

type Answer = {
  status_line: string;
  duration_line: string;
  advice: string[];
  confidence_note: string;
  source: string;
};

type AdviseResponse =
  | { kind: "answer"; answer: Answer }
  | { kind: "clarify"; message: string }
  | { kind: "unknown_place"; message: string }
  | { error: string };

const YEAR = 60 * 60 * 24 * 365;

export function AnswerPanel({
  message,
  place,
  initialProfile,
  nowISO,
  pinned,
}: {
  message: string;
  place: { district: string; sector: string | null };
  initialProfile: Profile;
  nowISO: string;
  /** True when ?at= pinned the clock, in which case we forward it. */
  pinned: boolean;
}) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "failed">("loading");
  const [note, setNote] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (which: Profile) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setStatus("loading");
      setAnswer(null);
      setNote(null);

      try {
        const res = await fetch("/api/advise", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            message,
            profile: which,
            place,
            ...(pinned ? { now: nowISO } : {}),
          }),
        });
        const data: AdviseResponse = await res.json();

        if ("error" in data) throw new Error(data.error);
        if (data.kind === "answer") {
          setAnswer(data.answer);
          setStatus("ok");
        } else {
          setNote(data.message);
          setStatus("ok");
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setStatus("failed");
      }
    },
    [message, place, nowISO, pinned],
  );

  useEffect(() => {
    void run(profile);
    return () => abortRef.current?.abort();
  }, [run, profile]);

  function choose(next: Profile) {
    if (next === profile) return;
    setProfile(next);
    // Cheap persistence: the server reads this on the next navigation to pick
    // the dashboard's profile panel. No roundtrip, so the swap feels instant.
    document.cookie = `profile=${next}; path=/; max-age=${YEAR}; samesite=lax`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
          Advice for
        </div>
        <div className="flex gap-2">
          {PROFILES.map((p) => {
            const on = p === profile;
            return (
              <button
                key={p}
                type="button"
                onClick={() => choose(p)}
                aria-pressed={on}
                className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-2 transition active:scale-[0.97] ${
                  on
                    ? "border-ask/50 bg-ask/10 text-text"
                    : "border-line bg-surface text-muted"
                }`}
              >
                <span aria-hidden className="text-[13px] leading-none opacity-80">
                  {PROFILE_META[p].glyph}
                </span>
                <span className="text-[12px] font-medium leading-tight">
                  {PROFILE_META[p].label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {status === "loading" ? <Skeleton /> : null}

      {status === "failed" ? (
        <div className="rounded-card border border-line bg-surface px-4 py-3.5">
          <p className="text-[13px] font-medium">Advice is unavailable right now.</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            The model call did not come back. Everything above still holds — it comes from the
            utility&rsquo;s published records, not from the model.
          </p>
          <button
            type="button"
            onClick={() => void run(profile)}
            className="mt-3 rounded-full border border-line bg-raised px-4 py-2 text-[12.5px] transition active:scale-[0.98]"
          >
            Try again
          </button>
        </div>
      ) : null}

      {note ? (
        <div className="rounded-card border border-ask/30 bg-ask/5 px-4 py-3.5 text-[13.5px] leading-relaxed">
          {note}
        </div>
      ) : null}

      {answer ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-line bg-surface px-4 py-3.5">
            <p className="text-[14.5px] font-medium leading-snug">{answer.status_line}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
              {answer.duration_line}
            </p>
          </div>

          <ul className="flex flex-col gap-2.5">
            {answer.advice.map((item, i) => (
              <li
                key={i}
                className="rise flex gap-3 rounded-card border border-line bg-surface px-4 py-3.5"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span
                  aria-hidden
                  className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ask/80"
                />
                <span className="text-[13.5px] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          <div
            className="rise rounded-card border border-dashed border-line px-4 py-3"
            style={{ animationDelay: `${answer.advice.length * 90}ms` }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              What is weakest about this answer
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              {answer.confidence_note}
            </p>
          </div>

          <p className="px-1 font-mono text-[11px] leading-relaxed text-faint">{answer.source}</p>
        </div>
      ) : null}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-label="Preparing advice" aria-busy>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="breathe h-[56px] rounded-card border border-line bg-surface"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </div>
  );
}
