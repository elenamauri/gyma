"use client";

import { useMemo } from "react";

export function CalendarStreak({ dateKeys }: { dateKeys: string[] }) {
  const set = useMemo(() => new Set(dateKeys), [dateKeys]);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const startPad = (firstDow + 6) % 7; // Monday-first

  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ day: null, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }

  const monthLabel = now.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-bold capitalize">
        {monthLabel}
      </h2>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          const active = c.key ? set.has(c.key) : false;
          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center font-mono text-xs ${
                active ? "bg-accent text-chalk" : c.day ? "text-ink" : ""
              }`}
            >
              {c.day ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
