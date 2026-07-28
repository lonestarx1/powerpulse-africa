/**
 * The three things we remember, all of them chosen by the user, none of them
 * personal: which profile they picked, which place they picked, and which
 * language the UI is in.
 *
 * Cookies rather than localStorage so the server renders the right screen on
 * the first paint. Nothing here identifies anyone.
 */

import { cookies } from "next/headers";
import { normaliseUsername } from "./auth";
import { isLang, type Lang } from "./i18n";
import { isTier, type Tier } from "./tier";
import { decodePlace, isProfile, type Profile } from "./ui";

export type Prefs = {
  profile: Profile | null;
  place: { district: string; sector: string | null } | null;
  lang: Lang;
  tier: Tier;
  /** Pre-outage alerts switched on. Only meaningful on Pro. */
  alerts: boolean;
  /**
   * Mock account. See lib/auth.ts -- this is a display name in a cookie, not a
   * session, and nothing is protected by it.
   */
  user: string | null;
};

export async function readPrefs(): Promise<Prefs> {
  const store = await cookies();
  const profile = store.get("profile")?.value;
  const lang = store.get("lang")?.value;
  const tier = store.get("tier")?.value;

  return {
    profile: isProfile(profile) ? profile : null,
    place: decodePlace(store.get("place")?.value),
    lang: isLang(lang) ? lang : "en",
    tier: isTier(tier) ? tier : "free",
    alerts: store.get("alerts")?.value === "on",
    user: normaliseUsername(store.get("user")?.value),
  };
}
