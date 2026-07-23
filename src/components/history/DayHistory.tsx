"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { toDateKey } from "@/lib/utils";
import { EmptyState } from "@/components/ui/primitives";

export function DayHistory({ dateKey }: { dateKey: string }) {
  const { sessions, ready } = useAppStore();

  const daySessions = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            s.status === "completed" &&
            toDateKey(s.completedAt ?? s.startedAt) === dateKey,
        )
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? b.startedAt).getTime() -
            new Date(a.completedAt ?? a.startedAt).getTime(),
        ),
    [sessions, dateKey],
  );

  const titleDate = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    if (!m) return dateKey;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [dateKey]);

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm capitalize text-muted">{titleDate}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Allenamenti
        </h1>
      </div>

      {daySessions.length === 0 ? (
        <EmptyState
          title="Nessuna sessione"
          description="Non ci sono allenamenti completati in questo giorno."
          action={
            <Link
              href="/"
              className="text-sm text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Torna alla home
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {daySessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/history/${s.id}`}
                className="flex items-center justify-between gap-3 py-4 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {s.routineName ?? "Sessione"}
                    {s.prs && s.prs.length > 0 && (
                      <span className="ml-2 text-xs text-accent">PR</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    {new Date(s.completedAt ?? s.startedAt).toLocaleTimeString(
                      "it-IT",
                      { hour: "2-digit", minute: "2-digit" },
                    )}{" "}
                    · {s.exercises.length} esercizi · {s.type}
                  </div>
                </div>
                <span className="text-muted" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
