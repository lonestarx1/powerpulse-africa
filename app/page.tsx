"use client";

/**
 * The demo surface: a 390px SMS-style thread.
 *
 * The production channel for this product is SMS/USSD -- the person we are
 * building for has no power and is rationing phone battery. This web page is
 * how we show it working, which is why it is shaped like a text conversation
 * rather than a dashboard.
 */

import { useEffect, useRef, useState } from "react";

const PROFILES = [
  { id: "household", rw: "Urugo", en: "Household", emoji: "🏠" },
  { id: "shop_owner", rw: "Ubucuruzi", en: "Shop", emoji: "🏪" },
  { id: "remote_worker", rw: "Akazi ka interineti", en: "Remote work", emoji: "💻" },
] as const;

type Profile = (typeof PROFILES)[number]["id"];
type Lang = "rw" | "en";

/**
 * Kinyarwanda is the default and English is a toggle, not the other way round.
 * The language also goes to the API: if you have put the app in English you
 * want the answer in English, whatever language you typed the place name in.
 */
const COPY = {
  rw: {
    tagline: "Amakuru ya REG · Kinyarwanda",
    who: "Uri nde? Bituma inama zihuye n'ibyo ukeneye.",
    noAccount: "Nta konti. Nta makuru bwite abikwa kuri seriveri.",
    prompt: "Nta muriro? Andika aho uri — urugero:",
    placeholder: "Andika aho uri…",
    send: "Ohereza",
    failed: "Habaye ikibazo. Ongera ugerageze.",
    offline: "Ntibishoboka guhuza na seriveri.",
    suggestions: [
      "Nta muriro mu Kimironko",
      "Hano mu Masaka nta amashanyarazi",
      "Ni ryari umuriro uzagaruka i Gisozi?",
    ],
  },
  en: {
    tagline: "REG outage records · English",
    who: "Who are you? It changes the advice you get.",
    noAccount: "No account. Nothing personal is stored on the server.",
    prompt: "Power out? Type where you are — for example:",
    placeholder: "Where are you?",
    send: "Send",
    failed: "Something went wrong. Try again.",
    offline: "Could not reach the server.",
    suggestions: [
      "Power out in Kimironko",
      "No electricity here in Masaka",
      "When will power come back in Gisozi?",
    ],
  },
} as const;

type Answer = {
  status_line: string;
  duration_line: string;
  advice: string[];
  confidence_note: string;
  source: string;
};

type Candidate = { district: string; sector: string | null; label: string };

type Bubble =
  | { from: "user"; text: string }
  | { from: "bot"; kind: "answer"; answer: Answer; place: string }
  | { from: "bot"; kind: "text"; text: string; candidates?: Candidate[] }
  | { from: "bot"; kind: "typing" };

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lang, setLang] = useState<Lang>("rw");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const t = COPY[lang];

  useEffect(() => {
    const stored = localStorage.getItem("umuriro.profile") as Profile | null;
    if (stored && PROFILES.some((p) => p.id === stored)) setProfile(stored);
    const storedLang = localStorage.getItem("umuriro.lang") as Lang | null;
    if (storedLang === "rw" || storedLang === "en") setLang(storedLang);
  }, []);

  function toggleLang() {
    const next: Lang = lang === "rw" ? "en" : "rw";
    localStorage.setItem("umuriro.lang", next);
    setLang(next);
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles]);

  function chooseProfile(id: Profile) {
    localStorage.setItem("umuriro.profile", id);
    setProfile(id);
  }

  async function send(text: string, place?: Candidate) {
    if (!text.trim() || busy || !profile) return;
    setInput("");
    setBusy(true);
    setBubbles((b) => [...b, { from: "user", text }, { from: "bot", kind: "typing" }]);

    try {
      const res = await fetch("/api/advise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          profile,
          language: lang,
          place: place ? { district: place.district, sector: place.sector } : undefined,
        }),
      });
      const data = await res.json();

      setBubbles((b) => {
        const next = b.filter((x) => !("kind" in x && x.kind === "typing"));
        if (!res.ok) {
          return [...next, { from: "bot", kind: "text", text: data.error ?? t.failed }];
        }
        if (data.kind === "answer") {
          const p = data.place.sector
            ? `${data.place.sector}, ${data.place.district}`
            : data.place.district;
          return [...next, { from: "bot", kind: "answer", answer: data.answer, place: p }];
        }
        return [...next, { from: "bot", kind: "text", text: data.message, candidates: data.candidates }];
      });
    } catch {
      setBubbles((b) => [
        ...b.filter((x) => !("kind" in x && x.kind === "typing")),
        { from: "bot", kind: "text", text: t.offline },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <ProfilePicker onPick={chooseProfile} lang={lang} onToggleLang={toggleLang} />;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[390px] flex-col bg-[#0d1117] text-zinc-100">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Umuriro</h1>
          <p className="text-[11px] text-zinc-400">{t.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} onToggle={toggleLang} />
          <button
            onClick={() => {
              localStorage.removeItem("umuriro.profile");
              setProfile(null);
            }}
            className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-zinc-300"
          >
            {PROFILES.find((p) => p.id === profile)?.[lang]}
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {bubbles.length === 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-sm text-zinc-400">{t.prompt}</p>
            {t.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-zinc-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {bubbles.map((b, i) =>
          b.from === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-amber-500 px-4 py-2 text-sm text-black">
                {b.text}
              </p>
            </div>
          ) : b.kind === "typing" ? (
            <div key={i} className="flex gap-1 px-2 py-2">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="h-2 w-2 animate-bounce rounded-full bg-zinc-500"
                  style={{ animationDelay: `${d * 120}ms` }}
                />
              ))}
            </div>
          ) : b.kind === "answer" ? (
            <AnswerBubble key={i} answer={b.answer} place={b.place} />
          ) : (
            <div key={i} className="max-w-[90%] space-y-2">
              <p className="rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-sm">{b.text}</p>
              {b.candidates?.map((c) => (
                <button
                  key={c.label}
                  onClick={() => send(c.label, c)}
                  className="mr-2 inline-block rounded-full border border-amber-500/40 px-3 py-1 text-xs text-amber-300"
                >
                  {c.label}
                </button>
              ))}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-white/10 px-3 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm outline-none placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
        >
          {t.send}
        </button>
      </form>
    </div>
  );
}

function AnswerBubble({ answer, place }: { answer: Answer; place: string }) {
  return (
    <div className="max-w-[90%] space-y-2 rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3 text-sm">
      <p className="font-medium text-amber-300">{place}</p>
      <p>{answer.status_line}</p>
      <p className="text-zinc-300">{answer.duration_line}</p>
      <ul className="space-y-1.5 pt-1">
        {answer.advice.map((a, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-amber-400">•</span>
            <span>{a}</span>
          </li>
        ))}
      </ul>
      <p className="pt-1 text-[11px] italic text-zinc-400">{answer.confidence_note}</p>
      {/* Visible grounding: every answer names the record it came from. */}
      <p className="border-t border-white/10 pt-2 text-[11px] text-zinc-500">{answer.source}</p>
    </div>
  );
}

function LangToggle({ lang, onToggle }: { lang: Lang; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={lang === "rw" ? "Switch to English" : "Hindura ujye mu Kinyarwanda"}
      className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-zinc-300"
    >
      {lang === "rw" ? "EN" : "RW"}
    </button>
  );
}

function ProfilePicker({
  onPick,
  lang,
  onToggleLang,
}: {
  onPick: (id: Profile) => void;
  lang: Lang;
  onToggleLang: () => void;
}) {
  const t = COPY[lang];
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[390px] flex-col justify-center gap-6 bg-[#0d1117] px-6 text-zinc-100">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Umuriro</h1>
          <p className="mt-2 text-sm text-zinc-400">{t.who}</p>
        </div>
        <LangToggle lang={lang} onToggle={onToggleLang} />
      </div>
      <div className="space-y-3">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left"
          >
            <span className="text-xl">{p.emoji}</span>
            <span>
              <span className="block text-sm font-medium">{p[lang]}</span>
              <span className="block text-xs text-zinc-500">
                {lang === "rw" ? p.en : p.rw}
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500">{t.noAccount}</p>
    </div>
  );
}
