# Umuriro

**Team Token Titans** · Track 04 — Energy & Climate Infrastructure · Frontiers GenAI Hackathon, ALX Kigali

> **A Kinyarwanda-first assistant that tells you whether your power cut is planned, how long it's likely to last, and what to do about it for the next few hours — grounded in REG's own published records, and built to say "I don't know" instead of inventing a restoration time.**

---

### The problem

When the power goes out in Kigali, the person sitting in the dark has no idea whether it's planned maintenance ending in two hours or a fault lasting until tomorrow. REG publishes the answer — as an HTML table, in English, paginated across ⟨126⟩ pages, on a website that assumes a laptop and a good connection.

The information exists. It does not reach the person who needs it, in the language they speak, on the phone they own.

The decisions waiting on that answer are real and time-sensitive: **do I discard the stock in my fridge? do I buy fuel for the generator? do I relocate to finish this work?**

### What it does

Ask in Kinyarwanda — *"nta muriro mu Kimironko"* — and get back three things:

1. **Is it planned?** Matched against REG's published schedule for your sector.
2. **How long?** REG's published window if one exists. If not, the historical average for *your* sector, labelled as historical, with the sample size it rests on.
3. **What to do now** — advice that changes with the outage duration **and** with who you are: household, shop owner, or remote worker.

The third part is the product. Anyone can look up a schedule. The same location at the same moment produces materially different guidance for a shop owner with cold stock than for a remote worker with a laptop battery.

### Why generative AI is load-bearing

Not a chatbot bolted onto a table. Three places where nothing else works:

1. **Messy, code-switched input.** *"nta muriro mu Kimironko"*, *"power out Gisozi"*, *"hano mu Masaka nta amashanyarazi"* — matched against free-text place names.
2. **Unstructured source data.** REG's `Sector / Areas` and `Reason` fields are prose: multiple districts per row, `All sectors in Rutsiro`, feeder names buried in quotes.
3. **Synthesis, not retrieval.** Duration + profile + food-safety thresholds + historical confidence, composed into advice in Kinyarwanda.

### Data source — real, public, verifiable

**https://www.reg.rw/customer-service/power-outages/** — Rwanda Energy Group's official outage listing.

⟨N⟩ records scraped and parsed, spanning ⟨date range⟩. Planned, current, and past outages, exploded to one row per outage × affected sector. Committed to the repo. **A judge can open the source and check us.**

No invented data. No seeded demo records. No cold start — the system is useful the moment it launches.

### Evaluation results

30 questions in Kinyarwanda: 25 answerable from REG data, 5 deliberately out of scope.

| metric | result |
|---|---|
| Location match accuracy | ⟨ / 25⟩ |
| Correct refusal rate (out-of-scope) | ⟨ / 5⟩ |
| Duration-grounded advice | ⟨ / 5⟩ |

*Full question set and scoring script in the repo under `eval/`.*

### Ethics choices

All three bonus criteria, structural rather than bolted on:

- **Human approval step** — when location match confidence is low, the system asks the user to confirm which sector they mean and offers the closest candidates. It does not guess. A confidently wrong location is our worst failure mode, so we designed it out.
- **Evaluation metrics** — above. Including a refusal rate, because knowing when to decline is a feature we scored.
- **Personalization with constraints** — advice varies by profile and duration, under explicit written constraints published in the repo as `prompts/system.txt`: never state a restoration time REG has not published; never invent facts about the world; label estimates below n=5 as weak; bias conservative on food, stock and money.

Food-safety thresholds live in `data/food_safety.json` — the model explains them, it never calculates them. When a call is marginal we recommend discarding. **We accept waste over illness, and we say so.**

> **We built it to say "I don't know."** Most demos would hallucinate an ETA to look smooth. Ours shows a real no-ETA case on purpose.

### Track fit

**Track 04 asks for a tool that helps a household adapt to energy conditions.** That is the product, stated literally — a household or small business deciding what to do about a power cut, in the hours it is happening.

It satisfies **Track 03** on every count as well: **Kinyarwanda-first**, **390px mobile viewport**, **designed as an SMS/USSD surface** for a low-end device on an unreliable connection. All three of that track's user constraints, not just one. We built for those constraints because our user has them — not to qualify for a track.

### What's next

- **SMS/USSD in production** — reaches a feature phone with no data connection, which is the actual constraint for most of the country.
- **Unplanned outages** — REG posts these to X without ETAs; ingesting them is where honest uncertainty matters most.
- **More languages** — the pipeline is language-agnostic; Swahili and French are the same work twice.
- **Sector-level reliability profiles** — with enough history, "your area averages 7 outages a year" becomes a planning tool, not just an alert.
