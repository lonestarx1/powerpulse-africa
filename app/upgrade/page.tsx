/**
 * Plans.
 *
 * The line between the tiers is the same line that runs through the codebase:
 * everything the utility published is deterministic, costs us nothing per
 * user, and stays free. The things with a real marginal cost -- a model call
 * per question, a message pushed to a phone -- are the paid ones.
 *
 * There is no payment integration here and the page says so. We are not
 * shipping a checkout form that looks real and takes nobody's money.
 */

import Link from "next/link";
import { setTier, signOut } from "@/app/actions";
import { Wordmark } from "@/components/chrome";
import { initialOf } from "@/lib/auth";
import { copyFor } from "@/lib/i18n";
import { readPrefs } from "@/lib/prefs";
import { FREE_FEATURES, PRICE, PRO_FEATURES } from "@/lib/tier";

type Params = { [key: string]: string | string[] | undefined };

export default async function UpgradePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { lang, tier, user } = await readPrefs();
  const t = copyFor(lang);

  const raw = typeof params.next === "string" ? params.next : "/area";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/area";
  const pro = tier === "pro";

  return (
    <main className="flex flex-1 flex-col pb-10">
      <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
        <Link
          href={next}
          className="-ml-1 flex min-h-[32px] items-center gap-1 px-1 text-[13px] text-muted transition active:scale-[0.97]"
        >
          <span aria-hidden>‹</span> {t.back}
        </Link>
        <Wordmark compact />
      </header>

      <section className="px-5 pt-8">
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-tight">
          What they published is free.
          <span className="block text-muted">What to do about it is Pro.</span>
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          Every outage record, every statistic and every source row stays free, for everyone,
          forever. We charge for the two things that cost us something for each person who uses
          them: advice written for your situation, and a message sent to your phone before the
          power goes.
        </p>
      </section>

      {/* --------------------------------------------------------- free plan */}
      <section className="mt-8 px-4">
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Free</h2>
            <span className="text-[12px] text-faint">{pro ? "included in Pro" : "your plan"}</span>
          </div>
          <ul className="mt-3.5 flex flex-col gap-2.5">
            {FREE_FEATURES.map((f) => (
              <Feature key={f} tone="var(--color-clear)">
                {f}
              </Feature>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- pro plan */}
      <section className="mt-3 px-4">
        <div className="overflow-hidden rounded-card border border-timed/35 bg-surface">
          <div className="border-b border-line px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-timed">Pro</h2>
              <span className="tnum text-[13px]">
                <span className="text-[18px] font-semibold">{PRICE.display}</span>
                <span className="text-muted">/{PRICE.period}</span>
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-muted">
              Paid with {PRICE.rails.join(" or ")} · cancel anytime
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 px-4 py-4">
            {PRO_FEATURES.map((f) => (
              <Feature key={f} tone="var(--color-timed)">
                {f}
              </Feature>
            ))}
          </ul>

          <div className="px-4 pb-4">
            {user ? (
              <form action={setTier}>
                <input type="hidden" name="next" value={next} />
                <input type="hidden" name="tier" value={pro ? "free" : "pro"} />
                <button
                  type="submit"
                  className={`grid min-h-[50px] w-full place-items-center rounded-full px-4 text-center text-[15px] font-semibold transition active:scale-[0.98] ${
                    pro ? "border border-line bg-raised text-muted" : "bg-timed text-black"
                  }`}
                >
                  {pro ? "Switch back to Free" : `Activate Pro for ${user}`}
                </button>
              </form>
            ) : (
              <>
                <Link
                  href={`/login?next=${encodeURIComponent("/upgrade?next=" + next)}`}
                  className="grid min-h-[50px] w-full place-items-center rounded-full bg-timed px-4 text-center text-[15px] font-semibold text-black transition active:scale-[0.98]"
                >
                  Sign in to subscribe
                </Link>
                <p className="mt-2 text-center text-[11px] leading-relaxed text-faint">
                  A subscription needs an account to belong to, and an alert needs somewhere to be
                  sent. The free tier does not — keep using it as a guest.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- account */}
      <section className="mt-3 px-4">
        <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
          <span
            aria-hidden
            className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
              user ? "border border-ask/40 bg-ask/10 text-ask" : "border border-line bg-raised text-faint"
            }`}
          >
            {user ? initialOf(user) : "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium">{user ?? "Using as a guest"}</p>
            <p className="truncate text-[11.5px] text-muted">
              {user
                ? pro
                  ? `Pro · ${PRICE.display}/${PRICE.period}`
                  : "Free plan"
                : "No account needed for the free tier"}
            </p>
          </div>
          {user ? (
            <form action={signOut}>
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                className="min-h-[36px] shrink-0 rounded-full border border-line bg-raised px-3.5 text-[12px] text-muted transition active:scale-[0.97]"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent("/upgrade?next=" + next)}`}
              className="flex min-h-[36px] shrink-0 items-center rounded-full border border-line bg-raised px-3.5 text-[12px] text-muted transition active:scale-[0.97]"
            >
              Sign in
            </Link>
          )}
        </div>
      </section>

      <section className="mt-7 px-5">
        <p className="text-[11px] leading-relaxed text-faint">
          Why this split: the free features are computed from records we already hold, so they
          cost the same whether one person uses them or a million do. A model call per question
          and a push per subscriber do not. Charging where the cost actually is keeps the free
          tier honest rather than deliberately hobbled.
        </p>
      </section>
    </main>
  );
}

function Feature({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <li className="flex gap-2.5 text-[12.5px] leading-relaxed">
      <svg
        viewBox="0 0 24 24"
        className="mt-[3px] size-3.5 shrink-0"
        fill="none"
        stroke={tone}
        strokeWidth="3"
        aria-hidden
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-muted">{children}</span>
    </li>
  );
}
