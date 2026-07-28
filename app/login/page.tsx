/**
 * Mock sign-in.
 *
 * The app works as a guest and always will -- everything the utility published
 * is free and needs no account. This screen exists because a subscription and
 * a pre-outage alert both need somewhere to belong, which is the honest
 * product reason a paid tier implies an account at all.
 *
 * The screen presents as finished for the demo. It is NOT authentication: no
 * user store, no hashing, no session, no server-side check, and the password is
 * discarded unread. See lib/auth.ts before touching any of this.
 */

import Link from "next/link";
import { signIn } from "@/app/actions";
import { Wordmark } from "@/components/chrome";
import { copyFor } from "@/lib/i18n";
import { readPrefs } from "@/lib/prefs";
import { PRICE } from "@/lib/tier";

type Params = { [key: string]: string | string[] | undefined };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { lang, user } = await readPrefs();
  const t = copyFor(lang);

  const raw = typeof params.next === "string" ? params.next : "/area";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/area";
  const failed = params.error === "1";

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

      <section className="px-5 pt-10">
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-tight">
          {user ? `Signed in as ${user}` : "Sign in"}
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          You never need an account to use PowerPulse. The outage record, the history and the
          schedule are free as a guest. An account is what a {PRICE.display}/{PRICE.period}{" "}
          subscription attaches to — and where a pre-outage alert knows to go.
        </p>

        <form action={signIn} className="mt-8 flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />

          <label className="flex flex-col gap-1.5">
            <span className="px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              Username
            </span>
            <input
              type="text"
              name="username"
              defaultValue={user ?? ""}
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="e.g. mukamana"
              aria-describedby={failed ? "username-error" : undefined}
              className={`min-h-[50px] rounded-2xl border bg-surface px-4 text-[15px] outline-none placeholder:text-faint focus:border-ask/50 ${
                failed ? "border-open/50" : "border-line"
              }`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              Password
            </span>
            {/*
              autoComplete is off on purpose: this is a mock and we do not want
              a browser password manager saving or filling a real credential
              against it. See lib/auth.ts.
            */}
            <input
              type="password"
              name="password"
              autoComplete="off"
              placeholder="Your password"
              className="min-h-[50px] rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none placeholder:text-faint focus:border-ask/50"
            />
          </label>

          {failed ? (
            <p id="username-error" className="px-1 text-[12px] text-open/90">
              Pick a username of 2–24 letters, numbers, dots, dashes or underscores.
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-1 grid min-h-[50px] place-items-center rounded-full bg-ask text-[15px] font-semibold text-black transition active:scale-[0.98]"
          >
            {user ? "Switch account" : "Sign in"}
          </button>
        </form>

        <Link
          href={next}
          className="mt-3 grid min-h-[46px] place-items-center rounded-full border border-line bg-surface text-[14px] text-muted transition active:scale-[0.98]"
        >
          Continue as a guest
        </Link>

        <p className="mt-6 text-[11px] leading-relaxed text-faint">
          Your account is tied to the mobile money number a Pro subscription is billed against, so
          alerts and billing reach the same place.
        </p>
      </section>
    </main>
  );
}
