# UX & Interface Plan

**Written 28 July 2026, 13:25 CAT. Code freeze is 15:00.** That is **95 minutes**, and roughly 20 of those belong to filming. Everything below is ordered so that the thing you build first is the thing that appears in the video. Cut from the bottom.

Backend contract is already fixed and is not up for renegotiation in this window — `lib/answer.ts` exports `advise()` returning `AdviseResponse`, and `app/api/advise/route.ts` is live. This document plans the surface on top of it.

---

## 1. Who is holding the phone

Not "a user." A specific person, in a specific state:

- **Their power just went out.** They are annoyed and they want one answer.
- **They are literally in the dark.** Screen glare is at maximum. Their pupils are dilated.
- **Their battery is finite and just became a resource.** Every percent is now a decision.
- **Their router is down.** If the power is out, so is the WiFi. They are on mobile data, possibly weak.
- **They will not read.** They will glance.

Three design axioms fall out of this, and each one is defensible out loud to a judge:

| Axiom | Because |
|---|---|
| **Dark by default. No light theme, no toggle.** | They are in the dark, on battery, with a bright screen in their face. This is ergonomics, not taste. On OLED it is also measurably less battery. |
| **The answer is a state, not a conversation.** | "Is my power out and for how long" has exactly one answer at one moment. Chat is the wrong metaphor for it. |
| **Nothing the model produces may be load-bearing for the facts.** | The verdict, the clock and the counts must render even if Gemini times out. See §5. |

---

## 2. The core call: card-first, not chat

`PLAN.md` §11 specifies "styled as an SMS/chat thread." **I want to overrule that for the primary screen**, and here is the argument.

A chat thread does three things wrong here:

1. It buries a glanceable answer inside a small grey bubble of body text. The most important information in the product renders at 15px in a container sized for someone else's message.
2. It requires scrolling to see the whole answer, on a screen the user is looking at for four seconds.
3. **Every other team will submit a chat UI.** In a screening round decided by a 2-minute video, looking like the other 49 submissions is a real cost.

The right mental model is **a weather app**. You ask once; you get a large, glanceable state; details sit underneath. That is precisely the shape of this problem.

> **Decision: the answer renders as a full-bleed status card. A compact thread lives underneath it for follow-ups.**

This keeps the SMS story completely intact — and the SMS story was never about the pixels. Say the line from `PLAN.md` §11 in the video verbatim: *"the production channel is SMS/USSD; this is the demo surface."* A card-first web demo does not weaken that sentence at all.

---

## 3. The four states

There are exactly four. Each is distinguishable by colour and shape **before any text is read**. This mapping is the whole visual system.

| State | When | Accent | Signature element |
|---|---|---|---|
| **OUT — planned** | `live.active` exists with an `end_time` | Amber `#FFB020` | Live countdown ring, sweeping |
| **OUT — no end time published** | `live.active` exists, `end_time === null` | Red `#FF5A5A` | **Deliberate absence of a ring.** A flat dashed arc and the words "REG has not published an end time." |
| **Nothing published** | no active outage | Green `#34D399` | Next scheduled outage, if any, as a quiet line |
| **Which place do you mean?** | `kind: "clarify"` | Neutral `#8B93A1` | Candidate cards, tappable |

**The second state is the product.** Most demos would invent an ETA to keep the screen looking healthy. Ours renders a visibly different, visibly designed screen that says it does not know. The design rule that enforces it:

> **No published end time → no ring, no progress arc, no number that ticks.** The visual language cannot express a duration the utility did not publish.

That is the anti-hallucination constraint expressed in CSS rather than in a prompt, and it is worth saying in exactly those words to a judge.

### The fourth state is not an edge case — check this before you build

I counted it in the parsed data: **198 sector names appear in more than one district.** `Masaka` resolves to Kicukiro, Rwamagana *and* Gasabo. `Kimisagara` resolves to four districts. Seven sector names collide with district names outright (`nyarugenge`, `kicukiro`, `ngoma`, `nyanza`, `ruhango`, `ngororero`, `kimonyi`).

`locate()` returns `needsConfirmation` on every one of those. **The clarify screen is a main path, not a fallback.** Budget real design time for it — and note that this is the human-approval ethics criterion made visible, so it is also a scoring surface. Build it as three tappable candidate cards, each showing the place label and how many REG records mention it, not as a line of grey text with a question mark.

---

## 4. Screen anatomy

One screen. One sheet. 360px minimum width (budget Android), designed at 390px.

```
┌─────────────────────────────────┐
│  ●  Kinyinya, Gasabo        ⌄   │  ← place chip, tap = change place
│                                 │
│        ╭───────────────╮        │
│        │   ◜◝  1:15    │        │  ← ring sweeps; number ticks each second
│        │  ◟ ◞  left    │        │     ring exists ONLY if REG published an end
│        ╰───────────────╯        │
│                                 │
│      POWER IS OUT — PLANNED     │  ← 32px, 600. The verdict.
│      Ends 14:00 · maintenance   │  ← 15px, muted
│                                 │
│  ┌───────────────────────────┐  │
│  │ REG · planned · 05 Aug ›  │  │  ← provenance chip → opens the record sheet
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  [ Household ][ Shop ][ Work ]  │  ← profile chips. Tap = advice re-renders.
├─────────────────────────────────┤
│  • Keep the fridge shut. Two    │  ← advice, streamed in staggered
│    hours will not spoil it.     │
│  • Charge your phone now if …   │
│  • …                            │
│                                 │
│  ⚠ Based on 27 past outages in  │  ← confidence_note, always rendered
│    Kinyinya. Average 1h 56m.    │
├─────────────────────────────────┤
│  ┌───────────────────────┐ [→]  │  ← input bar, fixed, above safe-area inset
│  │ Baza… / Ask…          │      │
│  └───────────────────────┘      │
└─────────────────────────────────┘
```

**Ordering rationale.** Countdown above verdict, verdict above advice, advice above provenance. The user's actual question is "how long," so the number wins the top of the screen. The provenance chip sits directly under the verdict because that adjacency — claim, then receipt — is the entire credibility argument, and it needs to be visible in the same frame of video.

**Profile chips sit *between* the facts and the advice.** This is deliberate and it is the money shot from `PLAN.md` §15: tapping a chip must visibly change the advice while the countdown above it keeps ticking, unchanged. Same data, different guidance, in one frame. Do not bury the profile in a settings screen.

### The record sheet

Tapping the provenance chip slides up a sheet showing the **raw scraped row, verbatim**, plus the `source_url` as a tappable link:

```
Date            05th August 2026
Time            12:00 PM - 02:00 PM
District        Gasabo
Sector / Areas  Gisozi, Kinyinya & Kacyiru
Reason          Maintenance and extension works
                on "UTEXRWA" feeder
Status          Planned

                       reg.rw ↗
```

Every claim on the card is one tap from the utility's own record. Nobody else in that room will have built this, and it takes fifteen minutes.

---

## 5. Architecture: the model never blocks the facts

This is the most important engineering decision in the interface, and it is a UX decision.

`advise()` currently does location matching, record lookup, history *and* the Gemini call in one pass, returning after ~1.5–3s. If the UI waits on that, the user stares at a skeleton for three seconds and a rate-limited key mid-demo produces a blank screen.

**Split the render into two tiers.**

```
submit
  ├─ POST /api/facts    ~80ms   → verdict, countdown, history, provenance   [no model]
  └─ POST /api/advise   ~2s     → advice bullets, confidence note           [model]
```

`app/api/facts/route.ts` is a **new file that edits nothing** — it imports the already-exported `locate`, `outagesForPlace`, `liveStatus` and `historyFor` and returns the deterministic half. `lib/answer.ts` is being edited by someone else right now; do not touch it. Budget: 10 minutes.

What this buys, in order of importance:

1. **The verdict paints in under 200ms.** The countdown is already ticking before the model has produced a token. On video this is the difference between "a working system" and "a demo waiting for an API."
2. **Graceful degradation is real.** If Gemini errors, rate-limits, or the key dies at 14:50, the card still shows the verdict, the clock, the history and the source. The advice section shows a quiet failure line. **The product still answers the question with the model completely offline.** Say this to a judge.
3. It makes the honesty story structural: the model is visibly downstream of the facts.

**Do not build token streaming.** No `streamObject`, no `@ai-sdk/react`, no NDJSON plumbing — that is a 40-minute detour into an unfamiliar API surface with 95 minutes on the clock. Instead: when `/api/advise` resolves, reveal the bullets **staggered 80ms apart** with a fade-and-rise. It is visually indistinguishable from streaming on a screen recording and it is three lines of CSS. The reveal is honest — the data really did arrive at that moment.

### Client bundle trap

`lib/outages.ts` imports 2.5MB of JSON. **If any `"use client"` file imports it, directly or transitively, that JSON ships to the browser** and the app becomes unusable on the exact connection we claim to design for. Rule: client components receive plain serialisable props only. Grep for it before you commit.

---

## 6. The demo clock — read this before you build anything

I checked the parsed data. **There are zero outage records dated today, 28 July 2026.**

```
planned records:  27 Jul (6) · 03 Aug (6) · 04 Aug (11) · 05 Aug (3)
records dated 2026-07-28:  none
```

If you demo against the real clock, **every query returns the green "nothing published" state.** The countdown never appears. The advice has nothing to condition on. The video has no product in it.

`liveStatus(records, now)` and `AdviseRequest.now` already take an injected `now` — this was designed for exactly this. **Wire a `?at=` query parameter through to it and treat it as P1, not as a nicety.** Without it there is no demo.

Three URLs to script the video around, verified against the data:

| Purpose | URL | What renders |
|---|---|---|
| **Live planned outage** | `/?q=nta muriro mu Kinyinya&at=2026-08-05T10:45:00Z` | Active 12:00–14:00, **1h 15m left**, ring sweeping, history n=27, mean 1h 56m |
| **No ETA — the honesty shot** | `/?q=Bugarama&at=2018-09-18T00:30:00Z` | Fault on Mashyuza feeder, **no published end time**, no ring |
| **Disambiguation** | `/?q=Masaka` | Three candidates: Kicukiro, Rwamagana, Gasabo |

Times are UTC; Kigali is UTC+2 year-round with no DST, per `KIGALI_OFFSET_MINUTES`.

Encoding the demo as URLs also means the video is reproducible, the back button works, and a judge can paste a link from the README and see the same screen you filmed. That is worth more than it sounds.

---

## 7. Design tokens

Put these in `app/globals.css` under Tailwind v4's `@theme` block. There is no `tailwind.config.js` in v4 — the existing file already uses `@import "tailwindcss"` and `@theme inline`, so extend that.

```css
@theme {
  --color-bg:        #0A0B0D;   /* near-black, not pure — pure black crushes on cheap panels */
  --color-surface:   #141619;
  --color-line:      rgba(255,255,255,0.08);
  --color-text:      #F2F4F7;
  --color-muted:     #8B93A1;

  --color-planned:   #FFB020;   /* out, with a published end   */
  --color-noeta:     #FF5A5A;   /* out, no published end       */
  --color-clear:     #34D399;   /* nothing published           */

  --radius-card:     20px;
}
```

**Type** — Geist is already installed and wired in `layout.tsx`; keep it, spend zero minutes on fonts.

| role | size / weight | notes |
|---|---|---|
| Countdown | 44px / 600 | tabular numerals — `font-variant-numeric: tabular-nums` or it jitters every second |
| Verdict | 32px / 600 | tracking-tight |
| Body, advice | 15px / 400 | line-height 1.5 |
| Labels, chips | 12px / 500 | uppercase, tracking-wide |

**The one flourish worth the time:** a single radial gradient glow behind the countdown ring in the current state colour, at ~12% opacity. Three lines of CSS. It is what makes the screen look designed rather than assembled, and it reinforces the state colour without adding another element.

Everything else stays flat. No shadows, no gradients on cards, no glass. Under-designed reads as confident; over-designed reads as a template.

---

## 8. Motion — the complete list

Four items. If it is not on this list, do not build it.

1. **Ring sweep on mount** — 600ms `ease-out`, from 0 to current progress.
2. **Countdown tick** — every 1s. `document.hidden` pauses it (battery, and it is the polite thing to do given the user).
3. **Advice stagger** — each bullet fades in + rises 8px, 80ms apart.
4. **Chip press** — `active:scale-[0.98]`, 100ms.

No page transitions. No parallax. No skeleton shimmer beyond a static muted block.

---

## 9. Build order — 95 minutes, cut from the bottom

| # | Item | Box | Notes |
|---|---|---|---|
| **1** | Shell: dark theme, tokens, `viewport` export, input bar with safe-area inset | 10m | Wipe the create-next-app boilerplate in `app/page.tsx` first |
| **2** | `/api/facts` route | 10m | New file. Edits nothing. |
| **3** | Status card: verdict + provenance chip + the three coloured states | 20m | The card without the ring already answers the question |
| **4** | Countdown ring + live tick | 15m | **P1. This is the shot.** |
| **5** | `?at=` clock override wired end to end | 5m | **Without this there is no demo — see §6** |
| **6** | Advice section + profile chips + staggered reveal | 15m | The money shot |
| **7** | Clarify state — three candidate cards | 10m | Main path (§3), and an ethics scoring surface |
| — | **FREEZE 15:00** | | |
| 8 | Record sheet (raw row + reg.rw link) | 15m | High credibility per minute. Do it if 3–7 land early. |
| 9 | Saved place in `localStorage` → zero-typing return visit | 10m | |
| 10 | Last answer cached; countdown ticks offline | 10m | Genuinely great for this user; pure arithmetic on published data |
| 11 | PWA manifest + `theme-color` | 5m | Removes browser chrome when launched from home screen |
| ✗ | Map of Rwanda, voice input, light theme, animated splash | — | **Cut. Do not start these.** |

**If item 4 is not working by 14:20, cut 6 and 7 and ship 1–3 + 5.** A card that shows the right verdict with a visible source beats a half-wired countdown.

---

## 10. Traps

- **`100vh` is wrong on mobile browsers.** Use `100dvh`, or the input bar hides behind Safari's chrome in the recording.
- **Safe-area inset.** `padding-bottom: env(safe-area-inset-bottom)` on the input bar, or it collides with the iPhone home indicator and looks broken on video.
- **Tabular numerals on the countdown**, or the digits shift width every second and the whole card twitches.
- **`searchParams` is a Promise in this Next version** — `const { q } = await searchParams`. It is not the API you remember.
- **Never let a `"use client"` file import `lib/outages.ts`** (§5).
- **Tap targets ≥ 44px.** Profile chips especially — they get tapped live on camera.
- **Test at 360px, not just 390px.** Budget Androids are the stated user.
- `PLAN.md` §9 says planned outages are "consistently 2 hours." True for all 26 forward-scheduled rows, but the **historical median is 3 hours and 519 of 3,160 records exceed 4 hours** — past the fridge threshold. Do not let a UI copy string promise two hours in general.

---

## 11. Video mapping

Which build item produces which second of the 2-minute video (`PLAN.md` §15):

| time | shot | needs |
|---|---|---|
| 0:20–1:20 | Type Kinyarwanda, card resolves, ring ticking | items 1–5 |
| **1:20–1:40** | **Tap profile chips — advice changes, countdown does not** | item 6 |
| 1:40–1:50 | Tap the provenance chip, raw REG row on screen | item 8 |
| 1:50–2:00 | The no-ETA URL. No ring. "REG has not published an end time." | items 3–5 |

Note that the closing honesty shot needs **no extra build** — it is the same card in a different state, reached by a different URL. That is what the four-state system buys you.

---

## 12. Naming

Still `⟨name TBD⟩` (`CONTEXT.md` §9). The interface needs it in three places — the title card, the `<title>`, and the PWA manifest. **Pick one at 14:30 whether or not anyone loves it**, and pick one that survives leaving Rwanda. `prompts/system.txt` currently opens with "You are Umuriro" — that string needs to change with it.
