/**
 * The conversational turn.
 *
 * The outage pipeline in answer.ts is deliberately rigid: it will not say a
 * word about power until it knows which place the utility published a record
 * for. That rigidity is the product. But it used to be the *only* path, so
 * "hello" fell through it and came back as "I have no REG record for that
 * place" -- which reads as broken, and spends the user's trust on nothing.
 *
 * This module is the other path. It handles the turns that carry no location
 * because they are not asking about one: greetings, "what can you do", "how
 * long does food keep", and questions we simply cannot answer. It is allowed
 * to be chatty precisely because it is not allowed to touch the outage data:
 * it never reads a record, so it can never misreport one.
 *
 * It also does the place extraction that used to be a separate model call --
 * one call now does both, and the extracted name still goes back through
 * locate(), so the model can only ever select a place that exists.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import foodSafety from "@/data/food_safety.json";
import { datasetSummary } from "./stats";
import { outages } from "./outages";

export const INTENTS = ["outage", "greeting", "about", "energy_general", "out_of_scope"] as const;
export type Intent = (typeof INTENTS)[number];

const chatPrompt = readFileSync(path.join(process.cwd(), "prompts", "chat.txt"), "utf8");

/** Computed once: the honest "how do you know this" numbers. */
const dataset = datasetSummary(outages);

const TriageSchema = z.object({
  intent: z.enum(INTENTS).describe("What the person is actually asking for."),
  place_mention: z
    .string()
    .nullable()
    .describe("The place name in the message, exactly as written, or null."),
  reply: z.string().describe("Two or three sentences, in the user's language."),
});

export type Triage = z.infer<typeof TriageSchema>;

/**
 * Deterministic fast path. A greeting is a closed set of words, so it does not
 * need a model -- and answering it without a network round trip keeps the
 * first turn of the demo instant. Anything longer than a few words falls
 * through to the model, because "hi, no power in Gisozi" is not a greeting.
 */
const GREETINGS =
  /^\s*(hi|hey|hello|yo|hola|good\s*(morning|afternoon|evening|day)|muraho|mwaramutse|mwiriwe|bite|amakuru|salut|bonjour)\b[\s!.,?]*$/i;

const THANKS = /^\s*(thanks?|thank\s*you|ok(ay)?|murakoze|urakoze|nice|great|cool|perfect|bye|goodbye|murabeho)\b[\s!.,?]*$/i;

export function fastReply(message: string, lang: "rw" | "en", place?: string | null): Triage | null {
  if (GREETINGS.test(message)) {
    return {
      intent: "greeting",
      place_mention: null,
      reply:
        lang === "rw"
          ? place
            ? `Muraho! Ndi PowerPulse. Nshobora kukubwira ibyo REG yatangaje ku muriro mu ${place}, n'icyo wakora mu gihe utawufite. Ubaza iki?`
            : "Muraho! Ndi PowerPulse. Mbwira umurenge cyangwa akarere urimo, nkubwire ibyo REG yatangaje ku muriro aho uri."
          : place
            ? `Hello. I'm PowerPulse — I can tell you what REG has published about power in ${place}, and what to do while it's out. What would you like to know?`
            : "Hello. I'm PowerPulse — I read Rwanda Energy Group's published outage records. Tell me your sector or district and I'll check what they've published for your area.",
    };
  }

  if (THANKS.test(message)) {
    return {
      intent: "greeting",
      place_mention: null,
      reply:
        lang === "rw"
          ? "Nta kibazo. Nihagira ikindi ushaka kumenya ku muriro, umbaze."
          : "Anytime. Ask me again if anything changes with the power.",
    };
  }

  return null;
}

/**
 * One model call that both classifies the turn and answers it. It is given the
 * dataset numbers and the food thresholds and nothing else -- no outage
 * records -- so the worst it can do is be vague.
 */
export async function triage({
  message,
  lang,
  model,
  profile,
  place,
}: {
  message: string;
  lang: "rw" | "en";
  model: string;
  profile: string;
  /** The place the user already picked in the UI, if any. */
  place?: string | null;
}): Promise<Triage> {
  const { output } = await generateText({
    model: google(model),
    output: Output.object({ schema: TriageSchema }),
    // A conversational turn is never worth a long wait, and this call can be
    // followed by a second one, so it fails fast rather than hanging the route.
    abortSignal: AbortSignal.timeout(15_000),
    maxRetries: 1,
    system: chatPrompt,
    prompt: [
      `USER MESSAGE: ${message}`,
      "",
      "CONTEXT:",
      JSON.stringify(
        {
          user_language: lang,
          profile,
          selected_place: place ?? null,
          dataset: {
            ...dataset,
            source: "Rwanda Energy Group published outage notices",
            note: "Published notices only. No live feed from the grid.",
          },
          food_safety: foodSafety,
        },
        null,
        1,
      ),
    ].join("\n"),
  });

  return output;
}
