/**
 * Filter box for the location step. A plain GET form: it works with no
 * JavaScript, and the result is still a list the user taps to confirm rather
 * than a guess we act on.
 */

import { copyFor, type Lang } from "@/lib/i18n";

export function PlaceSearch({
  defaultValue = "",
  lang,
}: {
  defaultValue?: string;
  lang: Lang;
}) {
  const t = copyFor(lang);
  return (
    <form method="GET" action="/location" className="flex items-center gap-2">
      <input
        type="text"
        name="find"
        defaultValue={defaultValue}
        placeholder={t.searchPlaceholder}
        autoComplete="off"
        enterKeyHint="search"
        aria-label={t.searchPlaceholder}
        className="min-h-[46px] w-full flex-1 rounded-full border border-line bg-surface px-4 text-[14px] outline-none placeholder:text-faint focus:border-ask/50"
      />
      <button
        type="submit"
        className="min-h-[46px] shrink-0 rounded-full border border-line bg-raised px-4 text-[13px] transition active:scale-[0.97]"
      >
        {t.find}
      </button>
    </form>
  );
}
