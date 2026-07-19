"use client";

import { formatWeight } from "@/lib/units";
import { Mono } from "@/components/ui/primitives";

export function Sparkline({
  label,
  points,
  unit,
  formatValue,
  showDelta = true,
}: {
  label: string;
  points: Array<{ date: string; value: number }>;
  unit?: string;
  /** Custom formatter; defaults to weight-style when unit is set. */
  formatValue?: (v: number) => string;
  showDelta?: boolean;
}) {
  const values = points.map((p) => p.value).filter((v) => v > 0);
  if (values.length < 1) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 320;
  const h = 96;
  const pad = 6;

  const filtered = points.filter((p) => p.value > 0);
  const coords = filtered
    .map((p, i, arr) => {
      const x = pad + (i / Math.max(arr.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - ((p.value - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const dots = filtered.map((p, i, arr) => {
    const x = pad + (i / Math.max(arr.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((p.value - min) / range) * (h - pad * 2);
    return { x, y, value: p.value, date: p.date };
  });

  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const deltaPct = first > 0 ? (delta / first) * 100 : 0;

  const fmt =
    formatValue ??
    ((v: number) =>
      unit ? `${formatWeight(v, unit as "kg")} ${unit}` : String(Math.round(v)));

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">
          {label}
        </span>
        <div className="text-right">
          <Mono className="text-sm">{fmt(last)}</Mono>
          {showDelta && values.length > 1 && (
            <div
              className={`text-[11px] ${
                delta > 0
                  ? "text-accent"
                  : delta < 0
                    ? "text-muted"
                    : "text-muted"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {fmt(delta)}
              {first > 0 ? ` (${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(0)}%)` : ""}
            </div>
          )}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full border border-hairline"
        role="img"
        aria-label={label}
      >
        <polyline
          fill="none"
          stroke="#E1442C"
          strokeWidth="1.5"
          points={coords}
        />
        {dots.map((d, i) => (
          <circle
            key={`${d.date}-${i}`}
            cx={d.x}
            cy={d.y}
            r="2.5"
            fill="#E1442C"
          />
        ))}
      </svg>
    </div>
  );
}

/** Weekly volume bars for the last N weeks. */
export function WeeklyVolumeBars({
  weeks,
  unit,
}: {
  weeks: Array<{ label: string; volume: number }>;
  unit: string;
}) {
  const max = Math.max(...weeks.map((w) => w.volume), 1);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">
          Volume settimanale ({unit})
        </span>
      </div>
      <div className="flex h-28 items-end gap-1.5 border border-hairline px-2 pb-2 pt-3">
        {weeks.map((w) => {
          const h = Math.max(4, Math.round((w.volume / max) * 100));
          return (
            <div
              key={w.label}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <div
                className="w-full bg-accent/90"
                style={{ height: `${h}%` }}
                title={`${w.label}: ${Math.round(w.volume)} ${unit}`}
              />
              <span className="text-[9px] uppercase tracking-wide text-muted">
                {w.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
