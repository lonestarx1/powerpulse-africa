import Link from "next/link";
import { chooseLang, resetPrefs } from "@/app/actions";
import { initialOf } from "@/lib/auth";
import { copyFor, type Lang } from "@/lib/i18n";
import { PROFILE_META, type Profile } from "@/lib/ui";

/**
 * The mark: a pulse line that stops dead, and a flat segment after it.
 * Source: docs/logo/01-broken-pulse.svg.
 */
export function Logo({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 32h9l6-17 8 30 5-13" />
      <path d="M48 32h12" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className={`grid place-items-center rounded-lg bg-ask/15 text-ask ${
          compact ? "size-6" : "size-7"
        }`}
      >
        <Logo className={compact ? "size-3.5" : "size-4"} />
      </span>
      <span className={`font-semibold tracking-tight ${compact ? "text-[13px]" : "text-[14px]"}`}>
        PowerPulse
      </span>
    </span>
  );
}

/**
 * Account state. Guest is a first-class state, not a nag -- the free tier
 * genuinely works without an account, so this is a chip, not a wall.
 */
export function AccountChip({ user, next }: { user: string | null; next: string }) {
  if (!user) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="flex min-h-[32px] items-center rounded-full border border-line bg-surface px-3 text-[11px] text-muted transition active:scale-[0.97]"
      >
        Guest
      </Link>
    );
  }
  return (
    <Link
      href={`/login?next=${encodeURIComponent(next)}`}
      aria-label={`Signed in as ${user}`}
      className="grid size-[32px] shrink-0 place-items-center rounded-full border border-ask/40 bg-ask/10 text-[12px] font-semibold text-ask transition active:scale-[0.97]"
    >
      {initialOf(user)}
    </Link>
  );
}

/** Server-rendered language switch, so every string flips, not just the model's. */
export function LangToggle({ lang, next }: { lang: Lang; next: string }) {
  const other: Lang = lang === "rw" ? "en" : "rw";
  return (
    <form action={chooseLang}>
      <input type="hidden" name="lang" value={other} />
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        aria-label={lang === "rw" ? "Switch to English" : "Hindura ujye mu Kinyarwanda"}
        className="min-h-[32px] rounded-full border border-line bg-surface px-2.5 text-[11px] font-medium text-muted transition active:scale-[0.97]"
      >
        {other.toUpperCase()}
      </button>
    </form>
  );
}

export function Header({
  lang,
  next,
  profile,
  compact = true,
  right,
}: {
  lang: Lang;
  next: string;
  profile?: Profile | null;
  compact?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
      <Link href="/" className="transition active:scale-[0.98]">
        <Wordmark compact={compact} />
      </Link>

      <div className="flex items-center gap-2">
        {right}
        <LangToggle lang={lang} next={next} />
        {profile ? (
          <form action={resetPrefs}>
            <button
              type="submit"
              className="min-h-[32px] rounded-full border border-line bg-surface px-3 text-[11px] text-muted transition active:scale-[0.97]"
            >
              {PROFILE_META[profile].label}
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}

/** Funnel header: where you are, and a way back. */
export function StepHeader({
  lang,
  step,
  total,
  backHref,
  next,
}: {
  lang: Lang;
  step: number;
  total: number;
  backHref: string;
  next: string;
}) {
  const t = copyFor(lang);
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="-ml-1 flex min-h-[32px] items-center gap-1 px-1 text-[13px] text-muted transition active:scale-[0.97]"
        >
          <span aria-hidden>‹</span> {t.back}
        </Link>
        <div className="flex items-center gap-2">
          <span className="tnum text-[11px] text-faint">
            {step} / {total}
          </span>
          <LangToggle lang={lang} next={next} />
        </div>
      </div>

      <div className="mt-3 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full ${i < step ? "bg-ask" : "bg-line"}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * There are no REG records dated today, so a live demo against the real clock
 * shows "nothing published" for every query. `?at=` pins the clock instead.
 * We label it on screen rather than quietly pretending it is now -- a tool
 * about not misleading people should not mislead people about its own clock.
 */
export function PinnedClockBanner({ label }: { label: string }) {
  return (
    <div className="mx-4 mt-3 flex items-center gap-2 rounded-full border border-dashed border-ask/40 bg-ask/5 px-3 py-1.5">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ask" />
      <span className="text-[11.5px] leading-tight text-ask/90">Showing {label}</span>
    </div>
  );
}
