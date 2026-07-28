/**
 * Scores the assistant against eval/questions.json and writes eval/results.md.
 *
 *   npm run dev                       # in another terminal
 *   node eval/run_eval.mjs            # or: EVAL_BASE_URL=https://... node eval/run_eval.mjs
 *
 * Three metrics, all deterministic -- no model judges its own homework:
 *
 *   1. Location match accuracy   did we resolve the right (district, sector)?
 *   2. Correct refusal rate      on the 5 out-of-scope questions, did we decline
 *                                instead of answering?
 *   3. Duration grounding        on the questions with a published outage window,
 *                                does the answer actually cite that window?
 *
 * Metric 3 is the one that matters. Any model can produce fluent advice; the
 * question is whether the advice is tied to the duration REG published.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const ROOT = process.cwd();
const spec = JSON.parse(readFileSync(path.join(ROOT, "eval", "questions.json"), "utf8"));
const NOW = spec._now_default;

const norm = (s) => (s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

async function ask(q) {
  const res = await fetch(`${BASE_URL}/api/advise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: q.question, profile: q.profile, now: NOW }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

function scoreLocation(q, res) {
  if (res.kind !== "answer") return { ok: false, got: res.kind };
  const gotDistrict = norm(res.place.district);
  const gotSector = norm(res.place.sector);
  const wantDistrict = norm(q.expect.district);
  const wantSector = norm(q.expect.sector ?? null);
  const ok = gotDistrict === wantDistrict && gotSector === wantSector;
  return { ok, got: res.place.sector ? `${res.place.sector}, ${res.place.district}` : res.place.district };
}

function scoreRefusal(res) {
  // Declining looks like: no place in our data, or asking which place is meant.
  // Producing a confident answer for Kampala is the failure we are measuring.
  const ok = res.kind === "unknown_place" || res.kind === "clarify";
  return { ok, got: res.kind };
}

function scoreDuration(q, res) {
  if (res.kind !== "answer") return { ok: false, got: res.kind };
  const text = `${res.answer.duration_line} ${res.answer.advice.join(" ")}`.toLowerCase();
  const hit = q.duration_tokens.find((tok) => text.includes(tok.toLowerCase()));
  return { ok: Boolean(hit), got: hit ?? res.answer.duration_line.slice(0, 80) };
}

const rows = [];
let locOk = 0, locTotal = 0, refOk = 0, refTotal = 0, durOk = 0, durTotal = 0, sourced = 0, answers = 0;

for (const q of spec.questions) {
  let res;
  try {
    res = await ask(q);
  } catch (error) {
    rows.push({ id: q.id, question: q.question, metric: "error", ok: false, got: String(error).slice(0, 120) });
    if (q.expect.kind === "refuse") refTotal++; else locTotal++;
    continue;
  }

  if (res.kind === "answer") {
    answers++;
    if (res.answer.source?.trim()) sourced++;
  }

  if (q.expect.kind === "refuse") {
    refTotal++;
    const r = scoreRefusal(res);
    if (r.ok) refOk++;
    rows.push({ id: q.id, question: q.question, metric: "refusal", ...r });
  } else {
    locTotal++;
    const r = scoreLocation(q, res);
    if (r.ok) locOk++;
    rows.push({ id: q.id, question: q.question, metric: "location", ...r });

    if (q.check_duration) {
      durTotal++;
      const d = scoreDuration(q, res);
      if (d.ok) durOk++;
      rows.push({ id: q.id, question: q.question, metric: "duration", ...d });
    }
  }
  process.stdout.write(".");
}

const pct = (a, b) => (b === 0 ? "n/a" : `${((100 * a) / b).toFixed(0)}%`);

const md = [
  "# Eval results",
  "",
  `Run against \`${BASE_URL}\` with \`now\` pinned to ${NOW} (12:30 in Kigali on 05 Aug 2026, inside a published outage window).`,
  "",
  "| Metric | Score | Target |",
  "| --- | --- | --- |",
  `| Location match accuracy | ${locOk}/${locTotal} (${pct(locOk, locTotal)}) | >= 24/25 |`,
  `| Correct refusal rate | ${refOk}/${refTotal} (${pct(refOk, refTotal)}) | 5/5 |`,
  `| Duration-grounded advice | ${durOk}/${durTotal} (${pct(durOk, durTotal)}) | ${durTotal}/${durTotal} |`,
  `| Answers carrying a source line | ${sourced}/${answers} (${pct(sourced, answers)}) | 100% |`,
  "",
  "## Per question",
  "",
  "| id | metric | ok | question | resolved / note |",
  "| --- | --- | --- | --- | --- |",
  ...rows.map(
    (r) => `| ${r.id} | ${r.metric} | ${r.ok ? "pass" : "FAIL"} | ${r.question.replace(/\|/g, "\\|")} | ${String(r.got).replace(/\|/g, "\\|")} |`,
  ),
  "",
].join("\n");

writeFileSync(path.join(ROOT, "eval", "results.md"), md);
console.log("\n" + md.split("## Per question")[0]);
console.log(`wrote eval/results.md`);
