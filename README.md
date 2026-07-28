# PowerPulse

**Ask about a power outage in your own language and get a straight answer: is it planned, how long, and what to do right now.**

<!-- TODO(artifacts): replace with a screen recording of an answer + the two-profile comparison -->
![PowerPulse answering a question about an outage in Gisozi](docs/demo.gif)

Built at the Frontiers GenAI Hackathon, ALX Kigali, 28 July 2026 — Track 04, Energy & Climate Infrastructure.

---

## The problem

Across much of Africa, when the power goes out people are left asking the same three questions: *Is this planned? How long will it last? What do I do now?*

Utilities often publish the answers — but in English, in paginated HTML tables that are painful to use on a phone, and with no guidance attached. Rwanda Energy Group's outage listing runs to **126 pages**. Nobody sitting in the dark is going to page through it.

The third question is the one nobody answers at all. A two-hour planned maintenance window and an open-ended fault call for completely different decisions, and those decisions differ again depending on whether you are running a household, protecting cold stock in a shop, or trying to stay online for work.

## What it does

You type where you are, in English, Kinyarwanda, or a mix. PowerPulse:

1. **Matches your message to a real place** in the utility's own records — including misspellings and code-switched phrasing.
2. **Tells you what the utility actually published**: planned or not, the window, the stated cause, the feeder.
3. **Grounds it in history** — how often this sector loses power, for how long, and on how many past records that is based.
4. **Gives advice conditioned on the duration and on who you are.** Same place, same moment, different profile → materially different guidance.
5. **Says "I don't know" when the data cannot support an answer.** No invented restoration times, ever.

Rwanda is the MVP. The architecture is utility-agnostic: expanding to another country means adding that utility's data source and language, not rebuilding the product.

## Why generative AI is load-bearing

Not decoration — three places where nothing else works:

- **Messy, code-switched input.** `"nta muriro mu Kimironko"`, `"power out Gisozi"`, `"hano mu Masaka nta amashanyarazi"` all have to resolve to a row in a table.
- **Unstructured source text.** The utility's `Sector / Areas` and `Reason` columns are free text with at least five distinct formats, multiple districts per row, and feeder names buried in prose.
- **Generated, situation-specific advice.** This is not a lookup. The same outage produces different guidance at 30 minutes remaining than at 6 hours unknown, and different guidance again for a shop owner with cold stock than for a household.

## Architecture

```
 user message (en / rw / mixed)
          │
          ▼
   lib/locate.ts ──── exact token → 2-gram → fuzzy (Levenshtein ≥ 0.82)
          │           LLM place extraction only if all three miss,
          │           and its output is fed back through the same index
          │           so it can never invent a place
          ▼
   lib/outages.ts ─── data/outages.json (3,201 records)
          │           what the utility published for this place, around now
          ▼
   lib/stats.ts ───── history for this place, every statistic carrying its n
          │
          ▼
      context object ──▶ Gemini (AI SDK v7) + prompts/system.txt ──▶ structured answer
          │                                                            │
          └── thresholds from data/food_safety.json ───────────────────┘
                                                                       ▼
                                              status · duration · advice · confidence · source
```

The model phrases, translates and personalises a context object that is **already true**. It does not decide where you are, compute durations, or set food-safety thresholds — those come from code and data files, deliberately, so they cannot be hallucinated.

## Data source

**Rwanda Energy Group — public power outage listing**
<https://www.reg.rw/customer-service/power-outages/>

| | |
| --- | --- |
| Pages crawled | 126 |
| Raw rows | 502 |
| Exploded records (one per outage × sector) | 3,201 |
| Districts | 34 |
| (district, sector) pairs | 1,047 |
| Rows dropped in parsing | **0** |
| Rows flagged low-confidence | 55 (11%) |

Both the raw scrape and the parsed output are committed, so the pipeline is reproducible without hitting the utility's site:

```bash
python3 scripts/scrape_reg.py     # → data/outages_raw.json
python3 scripts/parse_outages.py  # → data/outages.json + data/parse_failures.json
```

Two things worth knowing about the source:

- Pagination needs a `cHash` token taken from the previous page's HTML. Request a page number without it and the site returns **page 1 with HTTP 200** — a naive 1..126 loop silently yields 126 copies of the first page. The scraper crawls the "Next" link chain and fingerprints every page to prove it moved.
- The `Sector / Areas` column is hand-written. `"Mwogo, Juru in Bugesera; Masaka in Kicukiro"`, `"All sectors in Rutsiro"`, and `"Some parts of Ruhango, Nyanza and Huye Districts"` all appear. Where a row names several districts and the sector list cannot be tied to one of them, we mark the assignment `district_inferred` rather than picking a district and pretending we knew. Nothing is silently dropped; `data/parse_failures.json` lists every flagged row.

## Eval results

33 questions — 25 answerable, 3 where the utility published a start time and never an end, and 5 deliberately out of scope. Scored deterministically; no model grades its own work. Full per-question table in [`eval/results.md`](eval/results.md).

| Metric | Score | Target |
| --- | --- | --- |
| Location match accuracy | **28/28 (100%)** | ≥ 27/28 |
| Correct refusal rate | **5/5 (100%)** | 5/5 |
| Duration-grounded advice | **3/3 (100%)** | 3/3 |
| Honest on no published ETA | **3/3 (100%)** | 3/3 |
| Answers with no invented clock time | **28/28 (100%)** | 100% |
| Answers carrying a source line | **28/28 (100%)** | 100% |

The last three are the ones that matter, and the first two of them pull in opposite directions. *Duration-grounded* punishes an answer that ignores the window the utility published. *No invented clock time* punishes one that manufactures a window that was never published — every `HH:MM` in the answer must also appear in the context the model was given. The three no-ETA questions sit exactly on that seam: real 2018 outages that REG opened and never closed.

On one of them — an unplanned fault in Bugarama, Rusizi — the assistant answers: *"REG has not published a restoration time for this outage. Historical data shows past outages in this area averaged around 3 hours, but this is based on a weak sample of only 3 recorded outages."* That is the product.

```bash
npm run dev
npm run eval     # → eval/results.md
```

## Demo

Three cases, all reproducible against a local dev server:

```bash
# 1. Same place, same moment, two profiles -> materially different advice
curl -s localhost:3000/api/advise -H 'Content-Type: application/json' -d \
  '{"message":"power out in Gisozi","profile":"shop_owner","language":"en","now":"2026-08-05T10:30:00Z"}'
curl -s localhost:3000/api/advise -H 'Content-Type: application/json' -d \
  '{"message":"power out in Gisozi","profile":"remote_worker","language":"en","now":"2026-08-05T10:30:00Z"}'

# 2. Kinyarwanda in, Kinyarwanda out, with the food-safety threshold applied
curl -s localhost:3000/api/advise -H 'Content-Type: application/json' -d \
  '{"message":"nta muriro mu Gisozi, mfite inyama muri frigo","profile":"shop_owner","now":"2026-08-05T10:30:00Z"}'

# 3. It asks instead of guessing -- Kageyo is a real sector in Gicumbi (8
#    records), Ngororero (6) and Gatsibo (4), so no reading dominates
curl -s localhost:3000/api/advise -H 'Content-Type: application/json' -d \
  '{"message":"no power in Kageyo","profile":"household","language":"en"}'
```

## Ethics

These are structural, not bolted on:

- **It refuses.** Out-of-scope questions — another country, tariff policy, a phone number we do not hold — get "I don't know", not a plausible-sounding answer. The refusal rate is a scored metric, not an aspiration.
- **Human confirmation instead of guessing.** When the location match is ambiguous, the user is asked which place they mean. A wrong location produces a confidently wrong answer, which is the worst failure this product has.
- **No unpublished restoration times.** If the utility gave no end time, the answer says so. Historical averages are labelled as history and carry their sample size; anything under 5 records is stated as weak.
- **Conservative on food and money.** Spoilage thresholds live in `data/food_safety.json`, not in the model's head. Marginal calls resolve toward discarding food, and the answer says openly that we bias toward waste over illness.
- **No personal data.** No accounts, no server-side user records. Profile and language live in `localStorage`.

The full system prompt is committed at [`prompts/system.txt`](prompts/system.txt) — read the constraints yourself rather than taking our word for them.

## A note on the interface

The production channel for this product is **SMS/USSD**. The person we are building for has no power and is rationing phone battery. This 390px web app is the demo surface, which is why it is shaped like a text thread rather than a dashboard.

## Setup

```bash
cp .env.example .env          # add your Google AI Studio key
npm install
npm run dev                   # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio key. Server-side only — it never reaches the browser. |
| `POWERPULSE_MODEL` | Optional model override. Defaults to `gemini-3.6-flash`. |

```bash
node --env-file=.env scripts/check_model.mjs   # smoke test the key + model alone
```

## Repo layout

| Path | What |
| --- | --- |
| `scripts/scrape_reg.py` | Crawls the REG listing. Handles the `cHash` pagination trap. |
| `scripts/parse_outages.py` | Explodes raw rows into one record per (outage × sector). |
| `data/` | Raw scrape, parsed records, flagged rows, food-safety thresholds. |
| `prompts/system.txt` | The system prompt, verbatim. |
| `lib/` | Locate, stats, and the answer pipeline. |
| `app/api/advise/` | The one route handler. The API key stays here. |
| `eval/` | 30 questions, the scorer, and results. |
| `docs/` | Build plan, hackathon context, 1-pager. |

## Team

Adriel Niyodusaba · Dauglas · Kenya · Jeovanis · Darius (AUCA) · Sixalbert (ALX)
