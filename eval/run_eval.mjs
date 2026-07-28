/**
 * Scores the assistant against eval/questions.json and writes eval/results.md.
 *
 *   npm run dev                       # in another terminal
 *   node eval/run_eval.mjs            # or: EVAL_BASE_URL=https://... node eval/run_eval.mjs
 *
 * Four metrics, all deterministic -- no model judges its own homework:
 *
 *   1. Location match accuracy   did we resolve the right (district, sector)?
 *   2. Correct refusal rate      on the 5 out-of-scope questions, did we decline
 *                                instead of answering?
 *   3. Duration grounding        on the questions with a published outage window,
 *                                does the answer actually cite that window?
 *   4. No invented clock times   every HH:MM in the answer must also appear in
 *                                the context we handed the model.
 *
 * Metrics 3 and 4 are the ones that matter, and they pull in opposite
 * directions: 3 punishes an answer that ignores the published window, 4
 * punishes one that manufactures a window that was never published. The three
 * `no_eta` questions sit exactly on that seam -- REG gave a start time and no
 * end -- and are reported separately, because "it says I don't know" is the
 * whole claim.
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
    // Per-question `now` where the scenario needs a specific moment -- the
    // no-ETA records are real outages from 2018 that were never given an end.
    body: JSON.stringify({ message: q.question, profile: q.profile, now: q.now ?? NOW }),
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

/** "14:00", "2:00 PM", "2pm" -> minutes past midnight. */
function clockTokens(text) {
  const found = new Set();
  for (const m of text.matchAll(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi)) {
    let hour = Number(m[1]);
    const minute = Number(m[2]);
    if (minute > 59 || hour > 23) continue;
    const meridiem = m[3]?.toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    found.add(hour * 60 + minute);
    // With no am/pm marker a bare "2:00" is ambiguous; accept either reading
    // so we only fail on a time that matches nothing we supplied.
    if (!meridiem && hour < 12) found.add((hour + 12) * 60 + minute);
  }
  for (const m of text.matchAll(/\b(\d{1,2})\s*(am|pm)\b/gi)) {
    let hour = Number(m[1]);
    if (hour > 12) continue;
    if (m[2].toLowerCase() === "pm" && hour < 12) hour += 12;
    if (m[2].toLowerCase() === "am" && hour === 12) hour = 0;
    found.add(hour * 60);
  }
  return found;
}

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Every clock time the model was allowed to say: the window REG published, the
 * next published outage, and the sector's typical start hour. Anything else in
 * the answer was invented.
 */
function allowedTimes(context) {
  const allowed = new Set();
  for (const value of [
    context?.matched_outage?.start_time,
    context?.matched_outage?.end_time,
    context?.next_outage?.start_time,
    context?.next_outage?.end_time,
  ]) {
    const minutes = toMinutes(value);
    if (minutes !== null) allowed.add(minutes);
  }
  if (typeof context?.history?.typicalHour === "number") {
    allowed.add(context.history.typicalHour * 60);
  }
  return allowed;
}

function scoreInventedTimes(res) {
  if (res.kind !== "answer") return { ok: true, got: res.kind };
  const text = `${res.answer.status_line} ${res.answer.duration_line} ${res.answer.advice.join(" ")}`;
  const allowed = allowedTimes(res.context);
  const invented = [...clockTokens(text)].filter((t) => !allowed.has(t));
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return {
    ok: invented.length === 0,
    got: invented.length ? `invented ${invented.map(fmt).join(", ")}` : "none",
  };
}

const rows = [];
let locOk = 0, locTotal = 0, refOk = 0, refTotal = 0, durOk = 0, durTotal = 0;
let sourced = 0, answers = 0, timeOk = 0, timeTotal = 0, etaOk = 0, etaTotal = 0;

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

    timeTotal++;
    const t = scoreInventedTimes(res);
    if (t.ok) timeOk++;
    if (!t.ok) rows.push({ id: q.id, question: q.question, metric: "invented-time", ...t });

    if (q.no_eta) {
      etaTotal++;
      if (t.ok) etaOk++;
      rows.push({ id: q.id, question: q.question, metric: "no-eta", ...t });
    }
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
  `Run against \`${BASE_URL}\`. \`now\` defaults to ${NOW} (12:30 in Kigali on 05 Aug 2026, inside a published outage window); the no-ETA questions pin their own moment, on real 2018 outages that REG published with a start time and never an end.`,
  "",
  "| Metric | Score | Target |",
  "| --- | --- | --- |",
  `| Location match accuracy | ${locOk}/${locTotal} (${pct(locOk, locTotal)}) | >= 24/25 |`,
  `| Correct refusal rate | ${refOk}/${refTotal} (${pct(refOk, refTotal)}) | 5/5 |`,
  `| Duration-grounded advice | ${durOk}/${durTotal} (${pct(durOk, durTotal)}) | ${durTotal}/${durTotal} |`,
  `| Honest on no published ETA | ${etaOk}/${etaTotal} (${pct(etaOk, etaTotal)}) | ${etaTotal}/${etaTotal} |`,
  `| Answers with no invented clock time | ${timeOk}/${timeTotal} (${pct(timeOk, timeTotal)}) | 100% |`,
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
