/**
 * The freemium surfaces.
 *
 * Two rules held throughout:
 *
 *  1. A locked feature always shows what it would actually say, not a blurred
 *     smear. Teasing someone with unreadable text is a dark pattern and it
 *     tells them nothing about whether the thing is worth paying for.
 *  2. Nothing on the free tier is degraded to manufacture a reason to pay.
 *     Every fact the utility published stays free, including the raw record.
 */

import Link from "next/link";
import { setAlerts } from "@/app/actions";
import { PRICE, type Tier } from "@/lib/tier";

export function PlanBadge({ tier }: { tier: Tier }) {
  if (tier === "pro") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-timed/40 bg-timed/10 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-timed">
        <span aria-hidden className="size-1 rounded-full bg-timed" />
        Pro
      </span>
    );
  }
  return (
    <Link
      href="/upgrade"
      className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted transition active:scale-[0.97]"
    >
      Free
    </Link>
  );
}

export function LockIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A gated feature. Says plainly what it is, what it would do, and what it
 * costs -- then gets out of the way.
 */
export function LockedCard({
  title,
  body,
  bullets,
  cta,
  next,
  sample,
}: {
  title: string;
  body: string;
  bullets: readonly string[];
  cta: string;
  next: string;
  /** An honest, clearly-labelled example of the output. */
  sample?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-timed/30 bg-surface">
      <div className="flex items-start gap-3 px-4 pt-4">
        <span
          aria-hidden
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-timed/15 text-timed"
        >
          <LockIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium leading-snug">{title}</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{body}</p>
        </div>
      </div>

      <ul className="mt-3.5 flex flex-col gap-2 px-4">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted">
            <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-timed/70" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {sample ? (
        <div className="mt-4 border-t border-line bg-bg/60 px-4 py-3.5">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
            Example
          </p>
          <div className="mt-2">{sample}</div>
        </div>
      ) : null}

      <div className="px-4 pb-4 pt-4">
        <Link
          href={`/upgrade?next=${encodeURIComponent(next)}`}
          className="grid min-h-[46px] place-items-center rounded-full bg-timed px-4 text-center text-[14px] font-semibold text-black transition active:scale-[0.98]"
        >
          {cta}
        </Link>
        <p className="mt-2 text-center text-[11px] text-faint">
          {PRICE.display}/{PRICE.period} · cancel anytime
        </p>
      </div>
    </div>
  );
}

/**
 * Pre-outage alerts.
 *
 * The free/paid line here is "look it up" versus "we tell you": the schedule
 * itself is free and visible on this same screen, so nobody is locked out of
 * knowing. What Pro buys is not having to remember to check.
 */
export function AlertsCard({
  tier,
  enabled,
  next,
  lead,
  upcoming,
}: {
  tier: Tier;
  enabled: boolean;
  next: string;
  lead: string;
  /** The next published outage here, used for the preview. */
  upcoming: { day: string; window: string; area: string } | null;
}) {
  if (tier !== "pro") {
    return (
      <LockedCard
        title="Know before it goes"
        body={`An alert ${lead} before a planned outage in your area, so you charge what needs charging and finish what needs finishing.`}
        bullets={[
          "Only for the sector you picked — not the whole country",
          "Fires off the utility's published schedule, never a guess",
          "Silent when nothing is scheduled",
        ]}
        cta="Get pre-outage alerts"
        next={next}
        sample={<AlertPreview day="Wed 5 Aug" window="12:00 – 14:00" area="Kinyinya, Gasabo" lead={lead} />}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-xl bg-timed/15 text-timed"
        >
          ◈
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">Pre-outage alerts</p>
          <p className="truncate text-[11.5px] text-muted">
            {enabled ? `On · ${lead} before` : "Off"}
          </p>
        </div>

        <form action={setAlerts}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="alerts" value={enabled ? "off" : "on"} />
          <button
            type="submit"
            role="switch"
            aria-checked={enabled}
            aria-label="Pre-outage alerts"
            className={`relative h-[28px] w-[48px] shrink-0 rounded-full border transition ${
              enabled ? "border-timed/50 bg-timed/30" : "border-line bg-raised"
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-[3px] size-[20px] rounded-full transition-all ${
                enabled ? "left-[24px] bg-timed" : "left-[3px] bg-faint"
              }`}
            />
          </button>
        </form>
      </div>

      {enabled ? (
        <div className="border-t border-line bg-bg/60 px-4 py-3.5">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
            {upcoming ? "You will get this" : "Nothing scheduled — nothing to send"}
          </p>
          {upcoming ? (
            <div className="mt-2">
              <AlertPreview
                day={upcoming.day}
                window={upcoming.window}
                area={upcoming.area}
                lead={lead}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** What the alert actually looks like. Real copy, real numbers, no mockup gloss. */
export function AlertPreview({
  day,
  window,
  area,
  lead,
}: {
  day: string;
  window: string;
  area: string;
  lead: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3">
      <span
        aria-hidden
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-ask/15 text-ask"
      >
        <svg viewBox="0 0 64 64" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 32h9l6-17 8 30 5-13" />
          <path d="M48 32h12" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium leading-snug">
          Power off in {area} in {lead}
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
          {day}, {window}. Planned maintenance — charge what you need now.
        </p>
      </div>
    </div>
  );
}
