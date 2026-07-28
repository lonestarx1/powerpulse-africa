"use server";

/**
 * Preference writes for the setup funnel:
 *   /            landing
 *   /start       category   -> writes `profile`
 *   /location    district   -> sector  -> writes `place`
 *   /area        the record for that area
 *   /chat        ask the assistant
 *
 * Cookies rather than localStorage so the server renders the right screen on
 * the first paint -- no flash of onboarding for a returning user, and the
 * whole funnel still works with JavaScript disabled.
 *
 * Nothing here is sensitive: worst case someone forges their own profile chip.
 * The Google key never leaves the route handler.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normaliseUsername } from "@/lib/auth";
import { isLang } from "@/lib/i18n";
import { isTier } from "@/lib/tier";
import { isProfile } from "@/lib/ui";

const YEAR = 60 * 60 * 24 * 365;

/** Only ever redirect within this app. */
function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  if (typeof value !== "string" || !value) return fallback;
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function chooseProfile(formData: FormData) {
  const profile = formData.get("profile");
  const next = safeNext(formData.get("next"), "/location");

  if (isProfile(profile)) {
    const store = await cookies();
    store.set("profile", profile, { path: "/", maxAge: YEAR, sameSite: "lax" });
  }

  redirect(next);
}

export async function choosePlace(formData: FormData) {
  const place = formData.get("place");
  const next = safeNext(formData.get("next"), "/area");

  if (typeof place === "string" && place.includes("|")) {
    const store = await cookies();
    store.set("place", place, { path: "/", maxAge: YEAR, sameSite: "lax" });
  }

  redirect(next);
}

/**
 * Language toggle. Server-side so the whole page re-renders in the new
 * language, including the parts that never touch the model.
 */
export async function chooseLang(formData: FormData) {
  const lang = formData.get("lang");
  const next = safeNext(formData.get("next"), "/");

  if (isLang(lang)) {
    const store = await cookies();
    store.set("lang", lang, { path: "/", maxAge: YEAR, sameSite: "lax" });
  }

  redirect(next);
}

/**
 * Mock sign-in. See lib/auth.ts.
 *
 * The password is read off the form and dropped on the floor -- it is never
 * checked, never hashed, never stored and never leaves this function. Only the
 * username is written, to a plain cookie, so the demo can show that a
 * subscription and an alert destination have somewhere to live.
 */
export async function signIn(formData: FormData) {
  const username = normaliseUsername(formData.get("username"));
  const next = safeNext(formData.get("next"), "/area");

  if (!username) {
    const back = safeNext(formData.get("next"), "/area");
    redirect(`/login?error=1&next=${encodeURIComponent(back)}`);
  }

  const store = await cookies();
  store.set("user", username, { path: "/", maxAge: YEAR, sameSite: "lax" });
  redirect(next);
}

export async function signOut(formData: FormData) {
  const next = safeNext(formData.get("next"), "/");
  const store = await cookies();
  store.delete("user");
  // A subscription belongs to an account, so signing out drops it too.
  store.delete("tier");
  store.delete("alerts");
  redirect(next);
}

/**
 * Subscription state.
 *
 * DEMO ONLY: this flips a cookie. There is no payment integration behind it
 * and the UI says so on the upgrade screen -- we are not going to render a
 * convincing checkout that takes nobody's money. In production this is where
 * a mobile-money charge (MTN MoMo / Airtel Money) would be confirmed before
 * the tier is written.
 */
export async function setTier(formData: FormData) {
  const tier = formData.get("tier");
  const next = safeNext(formData.get("next"), "/area");

  if (isTier(tier)) {
    const store = await cookies();
    store.set("tier", tier, { path: "/", maxAge: YEAR, sameSite: "lax" });
    if (tier === "free") store.delete("alerts");
  }

  redirect(next);
}

/** Pre-outage alerts on or off. Pro only -- the server enforces it. */
export async function setAlerts(formData: FormData) {
  const on = formData.get("alerts") === "on";
  const next = safeNext(formData.get("next"), "/area");

  const store = await cookies();
  if (!isTier(store.get("tier")?.value) || store.get("tier")?.value !== "pro") {
    redirect("/upgrade");
  }

  if (on) store.set("alerts", "on", { path: "/", maxAge: YEAR, sameSite: "lax" });
  else store.delete("alerts");

  redirect(next);
}

/** Back to the first-run screen. Handy mid-demo. */
export async function resetPrefs() {
  const store = await cookies();
  store.delete("profile");
  store.delete("place");
  redirect("/");
}
