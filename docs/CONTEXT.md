# Hackathon Context — Frontiers GenAI Hackathon

Companion document to `PLAN.md`. This is the situational context: what the event is, what the rules say, what we are being judged against, and what that implies for how we work today.

---

## 1. The event

| | |
|---|---|
| **Name** | Frontiers Generative AI Hackathon |
| **Host** | ALX Kigali, in collaboration with **Google DeepMind** |
| **Venue** | ALX, Deco Center, KG 9 Ave, Kigali |
| **Date** | Tuesday, 28 July 2026 |
| **Check-in** | 7:00am (capacity-limited, approved guest list cross-checked) |
| **Field size** | ~50 teams × 5 people ≈ 250 participants |
| **Our team** | Token Titans — Team #1 (5) |

### Roster — the team as actually formed

| # | name | role (`PLAN.md` §14) |
|---|---|---|
| 1 | Adriel Niyodusaba | — |
| 2 | Dauglas *(Kenya)* | — |
| 3 | Jeovanis | — |
| 4 | Darius *(AUCA)* | — |
| 5 | Sixalbert *(ALX)* | — |

Parentheses are the disambiguators we're using in the room, not surnames.

**Roles are unassigned.** `PLAN.md` §14 defines five: Data, Pipeline, Kinyarwanda + Eval, Interface, Artifacts. Fill this table in — the Artifacts owner in particular belongs assigned **now, not at 3pm**.

> ⚠️ **Two open items before submission.**
>
> **1. This roster does not match the registration sheet.** `HackathonTeams` row 2 lists Token Titans as *IYABIVUZE Prince, Asifiwe Mucyo, Nana Tounda Dorcase Lesly, Michael, Adriel Niyodusaba* — only Adriel is on both. Teams were formed at 7:00am check-in, after that sheet was made, so this is expected. But **the organizers' record is what awards and credit run off.** Get the sheet corrected with whoever is running registration; don't discover the mismatch at 7:15pm.
>
> **2. We only have first names for four of five.** A 1-pager and a repo need full names. Collect them before the 3:00pm freeze.

**The framing question, verbatim from the brief:**

> "What can you build in 12 hours that addresses a real problem facing Africa today?"

**Note the arithmetic.** "12 hours" is the event day, not the build window. The actual sprint is **9:30am – 4:30pm ≈ 7 hours**, minus lunch, minus the artifact work that has to happen before the freeze. Plan for 7, not 12. This is the single most common way teams misjudge a hackathon.

---

## 2. The disclaimer (read it as a judging criterion, not boilerplate)

From the brief, italicised at the top of the sheet:

> *"Use generative AI responsibly. Outputs that are biased, harmful, or misleading will result in disqualification. Consider the real impact of your tool on the communities it is designed to serve."*

Two things follow:

1. **"Misleading" is an explicit disqualification condition.** For our project the concrete risk is stating a restoration time REG never published, or presenting a low-sample historical average as a prediction. This is why `PLAN.md` §8 constraints exist. They are not decoration.
2. **"Harmful" covers our food-safety module.** Telling a shop owner their stock is fine when it isn't is a real-world harm with a real-world cost. Conservative defaults, thresholds stored in data, never calculated by the model.

Judges from DeepMind will be attentive to this. Teams that treat it as a checkbox will read as teams that treat it as a checkbox.

---

## 3. Track structure

Five tracks. **Choose one.**

> ✅ **Decided: Track 04 — Energy & Climate Infrastructure.** Our registration sheet has Track 03 circled, but we are submitting against what we actually built. Strip the energy domain and no product remains; strip the multilingual low-bandwidth design and an outage assistant still stands. The domain is the thing.
>
> The **repositioning of 28 July makes this call stronger, not weaker.** We are no longer a Kinyarwanda-first product — we are an outage assistant for African households and small businesses, with Rwanda as the MVP market and language handling as one feature of an energy product rather than its thesis. Under Track 03 that repositioning would read as scope drift; under Track 04 it reads as a product with a market beyond the demo.
>
> The secondary reason is defensive. Track 03's own example list includes *"a question-answering tool that works accurately in Kinyarwanda"* — filing there invites the dismissal in §7 (a chatbot over a scraped table) and puts us in the crowded field where every language-first app lands. Under Track 04 the REG data is the centerpiece, not the backdrop.
>
> Claim the Track 03 fit in the 1-pager as evidence we understood our user's constraints. Do not file under it.

### Track 01 — Agriculture & BioSystems
**Prompt:** Build a generative AI tool that helps a farmer, agronomist, or food system actor make a better decision about what to grow, how to protect livestock, or when and where to sell produce.
*Examples given:* crop disease ID from a photo with treatment advice in the farmer's language; planting and harvesting advice based on location and season.

### Track 02 — Health Sciences & Biotech
**Prompt:** Build a generative AI tool that improves how patients, caregivers, or health workers communicate, understand, or act on health information **without replacing the clinician**.
*Examples given:* translate a diagnosis or discharge summary into an actionable explanation for a patient; detect counterfeit and expired medicine by scanning a package against known identifiers.

### Track 03 — AI & Consumer Technology ← *circled on the sheet; fully satisfied, but not our filing*
**Prompt:** Build an AI product designed specifically for a user who **speaks an African language, uses a low-end device, or has unreliable internet access**.
*Examples given:* a question-answering tool that works accurately in Kinyarwanda, Swahili, or another African language; a credit assessment tool for informal workers using mobile money history and community references instead of a credit file.

**How we satisfy it:** input and output in the user's own language, Kinyarwanda first among them; 390px mobile web app designed as an SMS/chat surface; explicitly framed as SMS/USSD in production. All three constraint categories in the prompt are addressed, not just one.

### Track 04 — Energy & Climate Infrastructure ← **ours — this is what we file under**
**Prompt:** Build a generative AI tool that helps a household, community, or local official produce, manage, or **adapt to energy and climate conditions**.
*Examples given:* optimize power distribution across a solar microgrid, prioritizing critical households during shortages; guide a community through documenting and submitting a carbon credit claim.

"Adapt to energy conditions" is a near-literal description of what we're building. Mention the dual fit in the 1-pager as a strength; don't apologise for it.

### Track 05 — Industrial Systems & Sovereign Technology
**Prompt:** Build a generative AI product that helps an African manufacturer, engineer, or business owner make, inspect, or deliver something with **higher value than raw materials**.
*Examples given:* analyze satellite or aerial imagery to identify a resource location, infrastructure gap, or land boundary; help an engineer adapt a product design to locally available materials and methods.

---

## 4. The ethics bonus

From the brief, verbatim:

> **Bonus: Design With Ethics In Mind**
> Teams will receive extra credit in judging for including one or more of the following:
> - human approval step
> - evaluation metrics
> - personalization with constraints

**We are doing all three.** This is the cheapest scoring opportunity on the sheet and most teams will skip it entirely — it competes with feature work and it isn't visible in a demo unless you deliberately make it visible.

| bonus item | how we satisfy it | where it's visible |
|---|---|---|
| Human approval step | System asks the user to confirm location when match confidence is low, instead of guessing. Advice is shown with sources, framed as guidance. | Demo + `src/locate.py` |
| Evaluation metrics | 30-question Kinyarwanda eval set. Three scored metrics: location match accuracy, correct-refusal rate, duration-grounded advice. | Video, README, 1-pager |
| Personalization with constraints | Advice varies by user profile *and* outage duration, under explicit written constraints — no invented ETAs, no invented world facts, conservative on food and money, weak estimates labelled weak. | `prompts/system.txt`, demo |

**Make the ethics work legible.** An eval number on screen and a deliberate "I don't know" moment in the video are worth more than a paragraph claiming we care.

---

## 5. Day timeline

| time | what |
|---|---|
| 7:00am | Check-in, breakfast, team formation |
| 9:00–9:30am | Google workshop — tooling overview, best practices, responsible AI primer |
| 9:30am–4:30pm | **Build sprint.** Optional office hours with Google engineers and PMs. Lunch provided midday. |
| 4:30–5:00pm | **Demo submission window** |
| 5:00–7:15pm | Demos & judging — top teams selected for 3-minute demo + 2-minute Q&A |
| 7:15–8:00pm | Awards, dinner appetizers, close |

Teams and the exact prompt sheet were assigned at registration.

**Office hours are underused.** Google engineers and PMs are available during the sprint. Twenty minutes with one of them on the "why generative AI" framing, or on Kinyarwanda output quality, is worth more than twenty minutes of debugging. Send one person, not the whole team.

---

## 6. Judging structure

Two stages:

**Stage 1 — screening.** All ~50 teams submit three things:
1. A **2-minute video**
2. A **GitHub repo**
3. A **1-page overview**

**Stage 2 — live pitch.** The 5 most promising teams pitch: **3-minute demo + 2-minute Q&A**. Top 3 receive awards.

### What this structure implies

- **Stage 1 is decided by artifacts, not by us.** No one is in the room to be charmed, and there's no Q&A to rescue a confusing submission. A judge screening 50 entries gives each maybe three minutes, and the video is what they open first. If it doesn't land in 30 seconds, the repo never gets clicked.
- **The video being pre-recorded is a gift.** No live-demo failure risk. Record a rough end-to-end version the moment anything works — that's the insurance copy. Re-record if something better exists at 3pm.
- **The repo is judged by its README.** Assume nobody runs the code.
- **Stage 2 rewards different things than Stage 1.** If we advance, the Q&A is where "why generative AI?" and "how do you know it works?" get asked. The eval numbers and §1 answer in `PLAN.md` are the preparation for that.

### Realistic odds

Base rate for top 3 is 6% (3 of 50). Our honest estimate with good execution is **10–15%** — above base rate because of real verifiable data, zero cold start, literal track fit, and structural ethics work; capped by the contestable "why genAI" question and untested Kinyarwanda quality.

**Idea selection is no longer the main variable. Execution and three minutes of video are.** A modest idea shipped cleanly with real numbers beats a strong idea shipped shakily, every time.

---

## 7. Competitive read

With 50 teams:

- **Expect heavy clustering on Track 02** (health) and on the sheet's own example ideas — crop disease from a photo, prescription translation, counterfeit medicine. If two teams build the same thing, execution and eval numbers break the tie.
- **Most submissions will be an LLM wrapper over invented or seeded data.** Our defensible edge is that our data is real, public, verifiable, and historical — a judge can open reg.rw and check.
- **Almost nobody will have an eval set.** "26/30 correct, 5/5 correct refusals" is the sentence that survives a skim of 50 submissions.
- **The available dismissal of our project** is "they scraped a government table and put a chatbot on it." Our defense is the historical statistics, the duration-conditioned advice, and the honest-uncertainty behavior — so all three have to be *visible in the video*, not buried in the repo.
- **The second available dismissal, new as of the repositioning, is "pan-African is a claim, not a build."** It is a fair hit if we let it stand. Answer it with sequencing, never with ambition: Rwanda is the MVP because REG publishes openly and 502 real records are the fastest honest test of the pipeline; the ingest layer normalizes any published listing into one schema, so the next country is a scraper and a language, not a rewrite. **Continental framing plus one proven market reads as judgment. Continental framing alone reads as vapor.**

---

## 8. Standing decisions

Recorded here so they don't get relitigated at 1pm:

0. **Positioning (28 July): pan-African product, Rwanda as MVP market.** Not "Kinyarwanda-first." The user is an African household or small business deciding what to do about a power cut; the language layer serves that user rather than defining the product. Every judge-facing artifact pairs the continental framing with the Rwandan proof point in the same breath — see §7.
1. **Web app, mobile viewport — not native.** Judges watch a video; a 390px web UI is indistinguishable from native on screen, and native costs build tooling and install friction for zero points.
2. **No crowdsourced reporting, no institutional dashboard, no household device survey.** All have cold-start problems and deliver value to someone who isn't in the room.
3. **Code freeze 3:00pm.** Artifacts need 90 real minutes.
4. **Submit at 4:15, not 4:29.**
5. **Scope cuts come from the bottom of the priority stack** (`PLAN.md` §12), never from the middle.

---

## 9. One-line summary for anyone joining mid-day

> We're building an outage assistant for African households and small businesses: ask in your own language, and it tells you whether your power cut is planned, how long it's likely to last based on the utility's own published records and history, and what to actually do about it for the next few hours — with advice that changes by user type and outage duration, and that says "I don't know" instead of inventing a restoration time. **Rwanda is the MVP**, running on 502 real records from REG; the ingest layer is built so the next utility is a scraper, not a rewrite.

**Naming.** Settled at 14:20 on **PowerPulse**, and the repo with it (`team_hallucination_nation` -> `powerpulse-africa`). Earlier drafts used *Umuriro*, Kinyarwanda for "fire/power", which read well in Kigali and stopped making sense the moment the product was positioned across the continent. PowerPulse survives leaving Rwanda, which was the whole test. English is the primary language with Kinyarwanda one tap away, for the same reason.
