/**
 * Small presentational primitives. Server-safe: no state, no browser APIs.
 *
 * Nothing here may import lib/outages.ts -- it carries 2.5MB of committed
 * JSON, and anything a client component pulls in ships to the browser.
 */

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: string;
}) {
  return (
    <section
      className={`rounded-card border border-line bg-surface ${className}`}
      style={tone ? { borderColor: `color-mix(in oklab, ${tone} 28%, transparent)` } : undefined}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
      {children}
    </h2>
  );
}

export function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

/** A statistic that always shows what it rests on. */
export function Stat({
  value,
  label,
  sub,
}: {
  value: ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="tnum text-[19px] font-semibold leading-tight text-text">{value}</div>
      <div className="mt-0.5 truncate text-[12px] text-muted">{label}</div>
      {sub ? <div className="truncate text-[11px] text-faint">{sub}</div> : null}
    </div>
  );
}

/**
 * Confidence is rendered, never hidden. Below n=5 the estimate is visibly
 * weaker than the type around it -- the design degrades with the data.
 */
export function ConfidenceTag({
  confidence,
  n,
}: {
  confidence: "low" | "medium" | "high";
  n: number;
}) {
  const tone =
    confidence === "low"
      ? "border-dashed border-open/40 text-open/90"
      : confidence === "medium"
        ? "border-line text-muted"
        : "border-clear/30 text-clear/90";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${tone}`}
    >
      {confidence === "low" ? "weak estimate" : `${confidence} confidence`}
      <span className="tnum opacity-70">n={n}</span>
    </span>
  );
}

/** Outages per month. Inline SVG, no chart library, no client JS. */
export function Sparkbars({
  buckets,
  color,
}: {
  buckets: { key: string; label: string; count: number }[];
  color: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="flex h-12 items-end gap-[3px]" aria-hidden>
      {buckets.map((b) => (
        <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-[2px]"
            style={{
              height: `${Math.max(2, (b.count / max) * 36)}px`,
              background: b.count ? color : "var(--color-line)",
              opacity: b.count ? 0.85 : 1,
            }}
          />
          <span className="text-[9px] leading-none text-faint">{b.label[0]}</span>
        </div>
      ))}
    </div>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-line" />;
}

/** A row of the raw REG record, rendered verbatim in the provenance sheet. */
export function RawRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-3 py-2">
      <dt className="text-[12px] text-faint">{k}</dt>
      <dd className="text-[13px] leading-snug text-text">{v}</dd>
    </div>
  );
}
