"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";

export default function RoutinesPage() {
  const { ready, routines } = useAppStore();

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  const sorted = [...routines].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <ul className="divide-y divide-hairline">
      <li>
        <Link
          href="/routines/new"
          className="flex min-h-16 items-center gap-3 py-4 text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-dashed border-hairline text-xl leading-none"
            aria-hidden
          >
            +
          </span>
          <div className="min-w-0">
            <div className="font-medium text-ink">Nuova routine</div>
            <div className="text-xs text-muted">Crea da zero</div>
          </div>
        </Link>
      </li>

      {sorted.map((r) => (
        <li key={r.id}>
          <Link
            href={`/routines/${r.id}`}
            className="flex min-h-16 items-center justify-between gap-3 py-4 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{r.name}</div>
              <div className="text-xs text-muted">
                {r.type === "reps" ? "Serie/reps" : "A tempo"} ·{" "}
                {r.exercises.length} esercizi
              </div>
            </div>
            <span className="text-muted" aria-hidden>
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
