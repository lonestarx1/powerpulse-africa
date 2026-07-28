/**
 * Smoke test: confirms GOOGLE_GENERATIVE_AI_API_KEY works through the AI SDK.
 *
 *   node --env-file=.env scripts/check_model.mjs
 *
 * Run this first when "the AI isn't working" -- it isolates the key + model
 * from the rest of the app.
 */
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const MODEL = process.env.POWERPULSE_MODEL ?? "gemini-3.6-flash";

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  console.error("Copy .env.example to .env and paste the key, then rerun with --env-file=.env");
  process.exit(1);
}

const { text, usage } = await generateText({
  model: google(MODEL),
  prompt: 'Reply in Kinyarwanda with one short sentence telling someone the power will be back in two hours.',
});

console.log(`model:  ${MODEL}`);
console.log(`output: ${text.trim()}`);
console.log(`tokens: in=${usage.inputTokens} out=${usage.outputTokens}`);
