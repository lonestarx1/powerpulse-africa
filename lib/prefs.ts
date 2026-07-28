/**
 * The three things we remember, all of them chosen by the user, none of them
 * personal: which profile they picked, which place they picked, and which
 * language the UI is in.
 *
 * Cookies rather than localStorage so the server renders the right screen on
 * the first paint. Nothing here identifies anyone.
 */

import { cookies } from "next/headers";
import { isLang, type Lang } from "./i18n";
import { decodePlace, isProfile, type Profile } from "./ui";

export type Prefs = {
  profile: Profile | null;
  place: { district: string; sector: string | null } | null;
  lang: Lang;
};

export async function readPrefs(): Promise<Prefs> {
  const store = await cookies();
  const profile = store.get("profile")?.value;
  const lang = store.get("lang")?.value;

  return {
    profile: isProfile(profile) ? profile : null,
    place: decodePlace(store.get("place")?.value),
    lang: isLang(lang) ? lang : "en",
  };
}
