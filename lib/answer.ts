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
import { fastReply, triage, type Intent } from "./chat";
import { locate, type Candidate } from "./locate";
import { historyFor, type History } from "./stats";
import { liveStatus, outagesForPlace, places, type Outage } from "./outages";

export const MODEL = process.env.POWERPULSE_MODEL ?? "gemini-3.6-flash";

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
  | {
      /**
       * A turn that was never about an outage record: a greeting, "what can
       * you do", a general energy question, or something we cannot answer.
       * Carries `message` so it renders as an ordinary reply, the same as
       * `clarify` and `unknown_place` do.
       */
      kind: "chat";
      intent: Intent;
      message: string;
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
 * Rough language pick, used only when the interface did not tell us. English is
 * the default, so this only has to spot a message that is recognisably
 * Kinyarwanda -- being wrong costs a language, not a fact.
 */
function detectLanguage(message: string): "rw" | "en" {
  const rwMarkers =
    /\b(nta|muriro|amashanyarazi|umuriro|hano|mfite|ryari|kuki|murakoze|urakoze|byaba|ubu|aha|mu|muraho|mwaramutse|mwiriwe|bite|amakuru|murabeho)\b/i;
  const enMarkers = /\b(the|power|is|out|when|will|back|how|long|my|we|there|no)\b/i;
  const rw = (message.match(rwMarkers) ?? []).length;
  const en = (message.match(enMarkers) ?? []).length;
  return rw > en ? "rw" : "en";
}

function label(c: { district: string; sector: string | null }, lang: "rw" | "en" = "en"): string {
  if (c.sector) return `${c.sector}, ${c.district}`;
  return lang === "rw" ? `${c.district} (akarere kose)` : `${c.district} (whole district)`;
}

function clarifyMessage(candidates: Candidate[], lang: "rw" | "en"): string {
  const list = candidates.map((c) => label(c, lang)).join(" / ");
  return lang === "rw"
    ? `Sinabashije kumenya neza aho uri. Ni hehe muri aha: ${list}?`
    : `I could not pin down your location. Which of these do you mean: ${list}?`;
}

function unknownPlaceMessage(lang: "rw" | "en"): string {
  return lang === "rw"
    ? "Sinabonye aho hantu mu makuru ya REG mfite. Nyandikira izina ry'umurenge cyangwa akarere."
    : "I have no REG record for that place. Try the sector or district name.";
}

export async function advise(req: AdviseRequest): Promise<AdviseResponse> {
  const now = req.now ?? new Date();
  const lang = req.language ?? detectLanguage(req.message);

  /** Set by the UI when the user picked a place, so it wins over the text. */
  let place = req.place ?? null;
  let needsConfirmation = false;
  let candidates: Candidate[] = [];

  // Does what they just typed name a place we hold records for? This runs even
  // when the UI already pinned one, because it is also how we tell an outage
  // question from a greeting without spending a model call on it.
  const located = locate(req.message);
  let namedAPlace = false;

  if (located.match) {
    namedAPlace = true;
    if (!place) {
      place = { district: located.match.district, sector: located.match.sector };
      needsConfirmation = located.needsConfirmation;
    }
  } else if (!place && located.candidates.length > 0) {
    namedAPlace = true;
    needsConfirmation = located.needsConfirmation;
    candidates = located.candidates;
  }

  // Nothing in the message points at a place, so we do not yet know that this
  // turn is about an outage at all. "Hello" is not a failed location lookup,
  // and answering it as one is what made the assistant feel like a form.
  if (!namedAPlace) {
    const here = place ? label(place, lang) : null;
    let turn = fastReply(req.message, lang, here);

    if (!turn) {
      try {
        turn = await triage({ message: req.message, lang, model: MODEL, profile: req.profile, place: here });
      } catch {
        // Triage is down or slow. If the user has already picked a place we
        // still have a real record to answer from, so take the outage path;
        // only give up when we have nothing at all.
        if (!place) return { kind: "unknown_place", message: unknownPlaceMessage(lang) };
        turn = null;
      }
    }

    // A place name the model spotted still has to survive locate(), so it can
    // only ever select somewhere that exists in the data.
    if (turn?.place_mention) {
      const second = locate(turn.place_mention);
      if (second.match) {
        place ??= { district: second.match.district, sector: second.match.sector };
        namedAPlace = true;
      } else if (!place && second.candidates.length > 0) {
        needsConfirmation = second.needsConfirmation;
        candidates = second.candidates;
        namedAPlace = true;
      }
    }

    if (!namedAPlace && candidates.length === 0) {
      // A follow-up like "what about my fridge?" is about the area they are
      // already looking at: when we know where they are, the grounded answer
      // beats the general one, so those turns fall through to the pipeline.
      // Greetings and questions about the app itself never do.
      const grounded =
        place !== null && (!turn || turn.intent === "outage" || turn.intent === "energy_general");
      if (!grounded) {
        return { kind: "chat", intent: turn!.intent, message: turn!.reply };
      }
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
    return { kind: "unknown_place", message: unknownPlaceMessage(lang) };
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
    abortSignal: AbortSignal.timeout(30_000),
    maxRetries: 1,
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
