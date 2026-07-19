"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  createEmptySession,
  createSessionFromRoutine,
  getActiveSessionId,
} from "@/components/session/LiveSession";
import { Button, EmptyState, Mono } from "@/components/ui/primitives";
import { computeStreak, toDateKey } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const { ready, routines, sessions, upsertSession } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setActiveId(getActiveSessionId());
  }, [sessions]);

  const completed = sessions.filter((s) => s.status === "completed");
  const streak = computeStreak(
    completed.map((s) => toDateKey(s.completedAt ?? s.startedAt)),
  );

  function startRoutine(routineId: string) {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    const session = createSessionFromRoutine(routine);
    upsertSession(session);
    router.push(`/session/live?id=${session.id}`);
  }

  function startEmpty() {
    const session = createEmptySession();
    upsertSession(session);
    router.push(`/session/live?id=${session.id}`);
  }

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Workout tracker</p>
        <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">
          GYMA
        </h1>
        <p className="max-w-md text-sm text-muted">
          Catalogo, routine e sessioni live. Tutto sul dispositivo, senza account.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {activeId && sessions.some((s) => s.id === activeId && s.status === "active") ? (
            <Button
              type="button"
              variant="accent"
              onClick={() => router.push(`/session/live?id=${activeId}`)}
            >
              Riprendi sessione
            </Button>
          ) : (
            <Button type="button" variant="accent" onClick={startEmpty}>
              Sessione libera
            </Button>
          )}
          <Link href="/routines">
            <Button type="button" variant="ghost">
              Routine
            </Button>
          </Link>
          <Link href="/catalog">
            <Button type="button" variant="ghost">
              Catalogo
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4 border-y border-hairline py-5">
        <Stat label="Streak" value={String(streak)} />
        <Stat label="Sessioni" value={String(completed.length)} />
        <Stat label="Routine" value={String(routines.length)} />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between border-b border-hairline pb-2">
          <h2 className="font-display text-lg font-bold">Avvia routine</h2>
          <Link href="/routines/new" className="text-sm text-muted hover:text-ink">
            + Nuova
          </Link>
        </div>
        {routines.length === 0 ? (
          <EmptyState
            title="Nessuna routine"
            description="Crea la tua prima routine oppure importane una da Claude."
            action={
              <Link href="/routines/new">
                <Button type="button">Crea routine</Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {routines.slice(0, 6).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-muted">
                    {r.type} · {r.exercises.length} esercizi
                  </div>
                </div>
                <Button type="button" onClick={() => startRoutine(r.id)}>
                  Avvia
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <Mono className="text-2xl">{value}</Mono>
    </div>
  );
}
