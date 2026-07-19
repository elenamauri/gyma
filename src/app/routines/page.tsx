"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";

export default function RoutinesPage() {
  const { ready, programs, routines } = useAppStore();

  const sorted = useMemo(
    () =>
      [...programs].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [programs],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of routines) {
      map.set(r.programId, (map.get(r.programId) ?? 0) + 1);
    }
    return map;
  }, [routines]);

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        I programmi raccolgono le tue routine (es. Abs A / Abs B).
      </p>

      <ul className="grid grid-cols-2 gap-3">
        <li>
          <Link
            href="/routines/programs/new"
            className="flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-hairline text-muted touch-manipulation hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="text-3xl leading-none" aria-hidden>
              +
            </span>
            <span className="px-2 text-center text-xs font-medium uppercase tracking-wide">
              Nuovo programma
            </span>
          </Link>
        </li>

        {sorted.map((p, index) => {
          const n = counts.get(p.id) ?? 0;
          return (
            <li key={p.id}>
              <Link
                href={`/routines/programs/${p.id}`}
                className="flex aspect-square flex-col overflow-hidden border border-hairline bg-white touch-manipulation hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="flex flex-1 items-center justify-center bg-white">
                  <span className="font-display text-5xl font-bold tabular-nums text-ink">
                    {index + 1}
                  </span>
                </div>
                <div className="border-t border-hairline bg-chalk px-2.5 py-2">
                  <div className="truncate text-sm font-medium text-ink">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-muted">
                    {n} {n === 1 ? "routine" : "routine"}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
