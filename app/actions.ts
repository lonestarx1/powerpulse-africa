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
import { isLang } from "@/lib/i18n";
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

/** Back to the first-run screen. Handy mid-demo. */
export async function resetPrefs() {
  const store = await cookies();
  store.delete("profile");
  store.delete("place");
  redirect("/");
}
