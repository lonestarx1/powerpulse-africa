/**
 * The pipeline: message -> location -> REG record + history -> context -> LLM.
 *
 * The model's job is narrow on purpose. It does not decide where the user is
 * (locate.ts does, from the data), it does not compute durations or food
 * thresholds (stats.ts and data/food_safety.json do), and it is not allowed to
 * produce an end time that REG did not publish. It phrases, translates and
 * personalises a context object that is already true.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import foodSafety from "@/data/food_safety.json";
import { locate, type Candidate } from "./locate";
import { historyFor, type History } from "./stats";
import { liveStatus, outagesForPlace, places, type Outage } from "./outages";

export const MODEL = process.env.UMURIRO_MODEL ?? "gemini-3.6-flash";

export const PROFILES = ["household", "shop_owner", "remote_worker"] as const;
export type Profile = (typeof PROFILES)[number];

const systemPrompt = readFileSync(
  path.join(process.cwd(), "prompts", "system.txt"),
  "utf8",
);

export const AnswerSchema = z.object({
  status_line: z.string().describe(
    "One sentence: is the power out here, and is it planned or unexplained.",
  ),
  duration_line: z.string().describe(
    "One or two sentences on how long. If REG published no end time, say so first, then give history labelled as history with its sample size.",
  ),
  advice: z.array(z.string()).min(2).max(4).describe(
    "Concrete actions for this profile, conditioned on the duration above.",
  ),
  confidence_note: z.string().describe(
    "The weakest thing about this answer: small sample, no published end time, or unconfirmed location.",
  ),
  source: z.string().describe(
    'Provenance, e.g. "REG, planned outage, 05 Aug 2026" or "REG historical records, 12 outages".',
  ),
});

export type Answer = z.infer<typeof AnswerSchema>;

export type AdviseRequest = {
  message: string;
  profile: Profile;
  coldItems?: string[];
  /**
   * The language the UI is in. When set it wins over detection -- if someone
   * has put the app in English they want the answer in English, whatever
   * language they happened to type the place name in.
   */
  language?: "rw" | "en";
  /** Set by the UI when the user picked from the disambiguation list. */
  place?: { district: string; sector: string | null };
  /** Injectable so the eval harness and the demo agree on "now". */
  now?: Date;
};

export type AdviseResponse =
  | {
      kind: "answer";
      answer: Answer;
      place: { district: string; sector: string | null };
      context: Context;
    }
  | {
      kind: "clarify";
      /** Ready-to-render question. Deterministic -- we do not ask a model to ask. */
      message: string;
      candidates: { district: string; sector: string | null; label: string }[];
    }
  | { kind: "unknown_place"; message: string };

type Context = {
  place: { district: string; sector: string | null };
  now: string;
  user_language: "rw" | "en";
  profile: Profile;
  cold_items: string[];
  matched_outage: {
    status: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    duration_minutes: number | null;
    minutes_remaining: number | null;
    reason_raw: string;
    feeder: string | null;
    district_inferred: boolean;
  } | null;
  next_outage: { date: string; start_time: string | null; end_time: string | null; reason_raw: string } | null;
  history: History;
  food_safety: typeof foodSafety;
  location: { needs_confirmation: boolean };
};

/**
 * Rough language pick. Kinyarwanda is the default, so this only has to spot a
 * message that is unambiguously English -- being wrong costs a language, not a
 * fact.
 */
function detectLanguage(message: string): "rw" | "en" {
  const rwMarkers = /\b(nta|muriro|amashanyarazi|umuriro|hano|mfite|ryari|kuki|murakoze|byaba|ubu|aha|mu)\b/i;
  const enMarkers = /\b(the|power|is|out|when|will|back|how|long|my|we|there|no)\b/i;
  const rw = (message.match(rwMarkers) ?? []).length;
  const en = (message.match(enMarkers) ?? []).length;
  return rw >= en ? "rw" : "en";
}

function label(c: { district: string; sector: string | null }, lang: "rw" | "en" = "rw"): string {
  if (c.sector) return `${c.sector}, ${c.district}`;
  return lang === "rw" ? `${c.district} (akarere kose)` : `${c.district} (whole district)`;
}

function clarifyMessage(candidates: Candidate[], lang: "rw" | "en"): string {
  const list = candidates.map((c) => label(c, lang)).join(" / ");
  return lang === "rw"
    ? `Sinabashije kumenya neza aho uri. Ni hehe muri aha: ${list}?`
    : `I could not pin down your location. Which of these do you mean: ${list}?`;
}

/**
 * Last resort before giving up: ask the model to pull a place name out of the
 * message. Its output is fed straight back through locate(), so it can only
 * ever select a place that exists in the REG data -- it cannot invent one.
 */
async function extractPlaceWithModel(message: string): Promise<string | null> {
  try {
    const { output } = await generateText({
      model: google(MODEL),
      output: Output.object({
        schema: z.object({
          place: z.string().nullable().describe("The Rwandan place name mentioned, or null."),
        }),
      }),
      system:
        "Extract the Rwandan place name (sector, district, cell or neighbourhood) from the message. " +
        "Return only the name, with no extra words. Return null if the message names no place.",
      prompt: message,
    });
    return output.place?.trim() || null;
  } catch {
    return null;
  }
}

export async function advise(req: AdviseRequest): Promise<AdviseResponse> {
  const now = req.now ?? new Date();
  const lang = req.language ?? detectLanguage(req.message);

  let place = req.place ?? null;
  let needsConfirmation = false;
  let candidates: Candidate[] = [];

  if (!place) {
    let result = locate(req.message);

    if (!result.match && result.candidates.length === 0) {
      const extracted = await extractPlaceWithModel(req.message);
      if (extracted) result = locate(extracted);
    }

    if (result.match) {
      place = { district: result.match.district, sector: result.match.sector };
    } else {
      needsConfirmation = result.needsConfirmation;
      candidates = result.candidates;
    }
  }

  if (!place) {
    if (candidates.length > 0) {
      return {
        kind: "clarify",
        message: clarifyMessage(candidates, lang),
        candidates: candidates.map((c) => ({
          district: c.district,
          sector: c.sector,
          label: label(c, lang),
        })),
      };
    }
    return {
      kind: "unknown_place",
      message:
        lang === "rw"
          ? "Sinabonye aho hantu mu makuru ya REG mfite. Nyandikira izina ry'umurenge cyangwa akarere."
          : "I have no REG record for that place. Try the sector or district name.",
    };
  }

  const records = outagesForPlace(place.district, place.sector);
  const live = liveStatus(records, now);
  const history = historyFor(place.district, place.sector, now);
  const matched: Outage | null = live.active;

  const context: Context = {
    place,
    now: now.toISOString(),
    user_language: lang,
    profile: req.profile,
    cold_items: req.coldItems ?? [],
    matched_outage: matched
      ? {
          status: matched.status,
          date: matched.date,
          start_time: matched.start_time,
          end_time: matched.end_time,
          duration_minutes: matched.duration_minutes,
          minutes_remaining: live.minutesRemaining,
          reason_raw: matched.reason_raw,
          feeder: matched.feeder,
          district_inferred: matched.district_inferred,
        }
      : null,
    next_outage: live.next
      ? {
          date: live.next.date,
          start_time: live.next.start_time,
          end_time: live.next.end_time,
          reason_raw: live.next.reason_raw,
        }
      : null,
    history,
    food_safety: foodSafety,
    location: { needs_confirmation: needsConfirmation },
  };

  const { output } = await generateText({
    model: google(MODEL),
    output: Output.object({ schema: AnswerSchema }),
    system: systemPrompt,
    prompt: [
      `USER MESSAGE: ${req.message}`,
      "",
      "CONTEXT:",
      JSON.stringify(context, null, 1),
    ].join("\n"),
  });

  return { kind: "answer", answer: output, place, context };
}

/** Exposed for the UI's disambiguation list and for smoke-testing the index. */
export function knownPlaces(limit = 20) {
  return places.slice(0, limit).map((p) => ({ ...p, label: label(p) }));
}
