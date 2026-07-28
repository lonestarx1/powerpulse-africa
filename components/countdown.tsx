"use client";

/**
 * The clock.
 *
 * Two components, and the difference between them is the honesty rule:
 *
 *   <Countdown>  renders ONLY when REG published an end time. It sweeps and
 *                it ticks down.
 *   <Elapsed>    renders when REG published a start and no end. It counts UP
 *                from a published fact and it has no progress arc, because
 *                there is no known total to be a fraction of.
 *
 * There is deliberately no third component that estimates an end time. The
 * visual language cannot express a duration the utility did not publish.
 */

import { useEffect, useState } from "react";

const R = 64;
const C = 2 * Math.PI * R;

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function unit(ms: number): string {
  return ms >= 3_600_000 ? "hours : minutes" : "minutes : seconds";
}

/**
 * `nowISO` is the server's notion of now -- the real clock, or the instant
 * pinned by `?at=` for a demo. We take the skew once on mount so a pinned
 * clock still ticks live, and so the first client paint matches the server's.
 */
function useVirtualNow(nowISO: string): number {
  const base = new Date(nowISO).getTime();
  const [now, setNow] = useState(base);

  useEffect(() => {
    const skew = base - Date.now();
    const tick = () => setNow(Date.now() + skew);
    tick();
    const id = window.setInterval(() => {
      // Stop burning battery while the phone is in a pocket.
      if (!document.hidden) tick();
    }, 1000);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [base]);

  return now;
}

export function Countdown({
  startISO,
  endISO,
  nowISO,
  color,
}: {
  startISO: string;
  endISO: string;
  nowISO: string;
  color: string;
}) {
  const now = useVirtualNow(nowISO);
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();

  const remaining = Math.max(0, end - now);
  const span = Math.max(1, end - start);
  const progress = Math.min(1, Math.max(0, (now - start) / span));
  const offset = C * progress;

  return (
    <div className="relative grid size-[160px] place-items-center">
      <svg viewBox="0 0 160 160" className="absolute size-full -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--color-line)" strokeWidth="7" />
        <circle
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          className="sweep"
          style={{ ["--sweep-from" as string]: `${C}` }}
        />
      </svg>
      <div className="relative text-center">
        <div className="tnum text-[40px] font-semibold leading-none tracking-tight">
          {fmt(remaining)}
        </div>
        <div className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-muted">
          {remaining <= 0 ? "due back" : "left"}
        </div>
        <span className="sr-only">{unit(remaining)} remaining</span>
      </div>
    </div>
  );
}

export function Elapsed({
  startISO,
  nowISO,
  color,
}: {
  startISO: string;
  nowISO: string;
  color: string;
}) {
  const now = useVirtualNow(nowISO);
  const elapsed = Math.max(0, now - new Date(startISO).getTime());

  return (
    <div className="relative grid size-[160px] place-items-center">
      <svg viewBox="0 0 160 160" className="absolute size-full -rotate-90">
        {/*
          Dashed, static, complete. It reads as "a clock with no end", not as
          progress toward one. Nothing here moves, because nothing is known
          to be moving toward anything.
        */}
        <circle
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="2 12"
          opacity="0.55"
          className="breathe"
        />
      </svg>
      <div className="relative text-center">
        <div className="tnum text-[40px] font-semibold leading-none tracking-tight">
          {fmt(elapsed)}
        </div>
        <div className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-muted">so far</div>
      </div>
    </div>
  );
}

/** No active outage: a calm mark, not an empty hole. */
export function ClearMark({ color }: { color: string }) {
  return (
    <div className="relative grid size-[160px] place-items-center">
      <svg viewBox="0 0 160 160" className="absolute size-full -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--color-line)" strokeWidth="7" />
        <circle
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={0}
          opacity="0.9"
          className="sweep"
          style={{ ["--sweep-from" as string]: `${C}` }}
        />
      </svg>
      <svg viewBox="0 0 24 24" className="relative size-9" fill="none" stroke={color} strokeWidth="2">
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
