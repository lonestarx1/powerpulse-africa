/**
 * Turn a free-text Kinyarwanda / English / code-switched message into a
 * (district, sector) from the REG data.
 *
 * Cheap things first, in this order:
 *   1. exact token match against the place index
 *   2. token n-grams, for two-word names ("Kigali Sector", "Rwabutenge Cell")
 *   3. fuzzy match (Levenshtein ratio >= 0.82) for typos and spelling variants
 *
 * The LLM is only asked to extract a place name when all three fail
 * (see extractPlaceWithModel in answer.ts), and its output is fed back
 * through the same three steps -- the model never invents a location that
 * is not in the data.
 *
 * A wrong location produces a confidently wrong answer, which is the worst
 * failure mode this product has. So when the best match is not clearly ahead
 * we return `needsConfirmation` with the top candidates and the UI asks.
 */

import { normKey, places, type Place } from "./outages";

/** Words that are never place names -- they otherwise fuzzy-match short sectors. */
const STOPWORDS = new Set(
  [
    // Kinyarwanda
    "nta", "muriro", "amashanyarazi", "umuriro", "hano", "mu", "aha", "ni",
    "ryari", "ni", "kuki", "gute", "iki", "cyangwa", "ariko", "none", "ubu",
    "nka", "kuva", "kugeza", "byaba", "ese", "nk", "murakoze", "mwaramutse",
    // English
    "power", "outage", "electricity", "out", "the", "in", "at", "is", "are",
    "no", "there", "when", "will", "back", "here", "my", "we", "have", "and",
    "for", "how", "long", "it", "to", "of", "a", "on", "from", "this", "that",
  ].map(normKey),
);

export type Candidate = Place & {
  /** 1 = exact token match. Below 1 = fuzzy. */
  score: number;
  matchedText: string;
};

export type LocateResult = {
  match: Candidate | null;
  candidates: Candidate[];
  /** True when we found something but are not confident enough to act on it. */
  needsConfirmation: boolean;
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

function ratio(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 0 : 1 - levenshtein(a, b) / max;
}

const FUZZY_THRESHOLD = 0.82;

/** Tokens and 2-grams of the message, minus stopwords, longest first. */
function candidateTerms(message: string): string[] {
  const words = message
    .split(/[^\p{L}\p{N}']+/u)
    .map((w) => normKey(w))
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  const terms = new Set<string>(words);
  for (let i = 0; i < words.length - 1; i++) terms.add(words[i] + words[i + 1]);
  return [...terms].sort((a, b) => b.length - a.length);
}

/**
 * Sector names repeat across districts (Nyarugenge is a district AND a sector
 * inside it). We keep every reading and let the caller disambiguate; the index
 * is ordered by how often REG mentions the place, so the common reading leads.
 */
export function locate(message: string): LocateResult {
  const terms = candidateTerms(message);
  const found = new Map<string, Candidate>();

  for (const term of terms) {
    for (const place of places) {
      let score = 0;
      if (place.key === term) score = 1;
      else if (place.key.length >= 5 && term.length >= 5) {
        const r = ratio(place.key, term);
        if (r >= FUZZY_THRESHOLD) score = r;
      }
      if (!score) continue;

      const id = `${place.district}/${place.sector ?? "*"}`;
      const existing = found.get(id);
      if (!existing || score > existing.score) {
        found.set(id, { ...place, score, matchedText: term });
      }
    }
  }

  const candidates = [...found.values()].sort(
    (a, b) => b.score - a.score || b.count - a.count,
  );

  if (candidates.length === 0) {
    return { match: null, candidates: [], needsConfirmation: false };
  }

  const best = candidates[0];
  const rivals = candidates.filter(
    (c) => c !== best && c.score >= best.score - 0.02 && c.key === best.key,
  );

  // Ambiguous when a different district claims the same name with comparable
  // confidence, or when the only hit is fuzzy and not obviously right.
  const needsConfirmation = rivals.length > 0 || best.score < 0.9;

  return {
    match: needsConfirmation ? null : best,
    candidates: candidates.slice(0, 4),
    needsConfirmation,
  };
}
