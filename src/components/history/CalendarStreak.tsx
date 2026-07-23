"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export function CalendarStreak({ dateKeys }: { dateKeys: string[] }) {
  const set = useMemo(() => new Set(dateKeys), [dateKeys]);
  const now = new Date();
  const [cursor, setCursor] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));

  const year = cursor.year;
  const month = cursor.month;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const startPad = (firstDow + 6) % 7; // Monday-first

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ day: null, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    setCursor((c) =>
      c.month === 0
        ? { year: c.year - 1, month: 11 }
        : { year: c.year, month: c.month - 1 },
    );
  }

  function nextMonth() {
    if (isCurrentMonth) return;
    setCursor((c) =>
      c.month === 11
        ? { year: c.year + 1, month: 0 }
        : { year: c.year, month: c.month + 1 },
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Mese precedente"
          className="flex h-9 w-9 items-center justify-center text-muted touch-manipulation hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          ←
        </button>
        <h2 className="font-display text-lg font-bold capitalize">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Mese successivo"
          className="flex h-9 w-9 items-center justify-center touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:text-hairline enabled:text-muted enabled:hover:text-ink"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          const active = c.key ? set.has(c.key) : false;
          const isToday = c.key === todayKey;
          const className = `aspect-square flex w-full items-center justify-center font-mono text-xs touch-manipulation ${
            active
              ? "bg-accent text-chalk"
              : c.day
                ? "text-ink"
                : ""
          } ${isToday && !active ? "ring-1 ring-inset ring-ink/30" : ""} ${
            isToday && active ? "ring-2 ring-inset ring-chalk/40" : ""
          }`;

          if (active && c.key) {
            return (
              <Link
                key={i}
                href={`/history/day/${c.key}`}
                aria-label={`Allenamenti del ${c.key}`}
                className={`${className} hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent`}
              >
                {c.day}
              </Link>
            );
          }

          return (
            <div key={i} className={className} aria-hidden={!c.day}>
              {c.day ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
