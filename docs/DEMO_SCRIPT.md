# PowerPulse — 2-minute demo script

Everything below is reproducible against the build as it stands. No mock screens, no seeded records, nothing that only works if you don't touch it.

**Two rules.** Record the voiceover separately from the screen capture — room noise kills more hackathon videos than weak content. Burn in subtitles; judges may watch muted.

---

## Before you hit record

| | |
| --- | --- |
| Viewport | 390 × 844 (Chrome DevTools → iPhone 14). Hide the URL bar in the capture crop. |
| Window A | Normal window. Profile: **Shop**. Place: **Gisozi, Gasabo**. |
| Window B | Private window. Profile: **Remote work**. Place: **Gisozi, Gasabo**. |
| Language | English. Do the Kinyarwanda question with the RW toggle on. |
| Reset | Clear cookies to replay the funnel from the landing page. |

The clock is pinned with `?at=` so a two-hour maintenance window is live while you film:

```
/area?at=2026-08-05T12:45        Gisozi — out now, ends 14:00
/chat?at=2026-08-05T12:45        the assistant, same moment
/chat?at=2018-09-18T08:00        Bugarama — the fault with no published end
```

`?at=` puts a dashed chip at the top of the screen reading **"Showing Wed 5 Aug, 12:45"**. **Leave it visible.** A judge who spots a rigged timestamp you didn't declare stops trusting everything else; a judge who sees you declare it stops worrying. If anyone asks, the record is real and committed — only the clock is moved, so a two-hour window is open while you film.

---

## Shot list

| Time | On screen | Voiceover |
| --- | --- | --- |
| **0:00–0:12** | Landing page. Slow scroll to the three-states block. | "When the power goes out, you want to know three things. Is this planned. How long. And what do I do right now." |
| **0:12–0:20** | Stop on "Three answers, and we mean all three". | "The utility publishes the first two — in English, in a table a hundred and twenty-six pages long. Nobody sitting in the dark is paging through that." |
| **0:20–0:34** | Tap **Get started** → tap **Shop** → **Gasabo** → **Gisozi**. Move fast; these are four taps. | "So we built PowerPulse. Tell it who you are, tell it where you are — four taps, no account." |
| **0:34–0:50** | The area screen paints — "Power is out", the 12:00–14:00 window, the UTEXRWA feeder. Rest on the outage card, then the history stats. | "This is your area, straight from the utility's own record. Out now, back at two. And underneath, every outage they've published here before — with how many records that's based on." |
| **0:50–1:04** | Tap **Ask the assistant**. Toggle to **RW**. Type: `nta muriro, mfite inyama muri frigo`. Let it answer. | "Ask in your own language. It answers in the same one — and it tells you which record the answer came from." |
| **1:04–1:14** | Point at the source line under the answer. Hold. | "Two hours doesn't spoil meat. A fridge holds four. So the honest answer here is: keep the door shut, you're fine." |
| **1:14–1:32** | **The money shot.** Cut window A and window B side by side, both Gisozi, both 12:45. Highlight the two different advice blocks. | "Same place. Same minute. Same outage. A shop protecting cold stock and someone trying to finish work get different answers — because the advice is generated against the duration and against who's asking. This is not a lookup table." |
| **1:32–1:44** | Switch place to **Bugarama, Rusizi**, then `/chat?at=2018-09-18T08:00`. Ask: `when is it back? my fridge is full`. Let the answer land. | "And this is the one we're proudest of. A real fault, in the record, that the utility opened and never closed." |
| **1:44–1:52** | Zoom the `duration_line`. Hold long enough to read it. | *(silent — let them read: "REG has not published a restoration time for this outage. Historical data shows past outages in this area averaged around 3 hours, but this is based on a weak sample of only 3 recorded outages.")* |
| **1:52–2:00** | Cut to a full-screen card with the eval table. | "We measured that. Thirty-three questions. It never invents a restoration time, and it declines every question it can't answer. We built it to say 'I don't know'." |

**Product visible by 0:20.** No team intro, no logo animation, no slide preamble.

---

## The closing card

Plain text, high contrast, on screen for the last eight seconds. Numbers only — a judge reads them faster than they hear them.

```
502 rows scraped · 3,201 records · 126 pages · reg.rw

Location match          28/28
Correct refusals         5/5
Duration-grounded        3/3
Honest with no ETA       3/3
No invented clock time  28/28
```

---

## Voiceover, clean

Record this straight through, then cut it to picture. ~215 words, comfortable at two minutes.

> When the power goes out, you want to know three things. Is this planned. How long. And what do I do right now.
>
> The utility publishes the first two — in English, in a table a hundred and twenty-six pages long. Nobody sitting in the dark is paging through that.
>
> So we built PowerPulse. Tell it who you are, tell it where you are — four taps, no account.
>
> This is your area, straight from the utility's own record. Out now, back at two. And underneath, every outage they've published here before — with how many records that's based on.
>
> Ask in your own language. It answers in the same one — and it tells you which record the answer came from.
>
> Two hours doesn't spoil meat. A fridge holds four. So the honest answer here is: keep the door shut, you're fine.
>
> Same place. Same minute. Same outage. A shop protecting cold stock and someone trying to finish work get different answers — because the advice is generated against the duration and against who's asking. This is not a lookup table.
>
> And this is the one we're proudest of. A real fault, in the record, that the utility opened and never closed.
>
> We measured that. Thirty-three questions. It never invents a restoration time, and it declines every question it can't answer. We built it to say "I don't know".

---

## Cut these if you run long

In this order, and no further:

1. The scroll through the three-states block (0:12–0:20) — tighten to 4 seconds.
2. The history stats on the area screen — the outage card alone carries it.
3. The Kinyarwanda food-safety beat (1:04–1:14).

**Never cut** the two-profile comparison or the no-ETA answer. Those are the two things no other team will have.

---

## Answers to have in one breath

**"Why does this need generative AI?"**
Three places. Messy code-switched input — *"nta muriro mu Kimironko"* has to resolve to a row in a table. Unstructured source text — the utility's area column is hand-written prose with at least five formats. And generated advice — the same outage produces different guidance at thirty minutes than at six hours unknown, and different again for a shop than for a household.

**"How do I know it isn't making things up?"**
Every clock time in an answer has to appear in the data we handed the model, and we score that: 28 out of 28. The model doesn't decide where you are, doesn't compute durations, and doesn't hold the food-safety thresholds — those are in code and in `data/food_safety.json`.

**"Only Rwanda?"**
Rwanda is the MVP because REG publishes openly, which makes it the fastest place to prove the pipeline against real mess. A new country is a new scraper and a new language, not a new product.

**"Your sample sizes are tiny."**
Some of them are, and the product says so out loud. Anything under five records is labelled a weak estimate in the answer itself — that's the Bugarama line.

---

## If the model is down at showtime

The area screen is pure arithmetic over committed records — it paints with no model call at all. Demo the funnel and the record, and show a pre-recorded clip for the assistant. Say plainly that the assistant is a live model call and this one is recorded. Do not fake it live.
