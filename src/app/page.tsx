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
  const hasActive =
    !!activeId && sessions.some((s) => s.id === activeId && s.status === "active");

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
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="font-display text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted">Allenati, tieni traccia, ripeti.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {hasActive ? (
            <Button
              type="button"
              variant="accent"
              className="w-full sm:w-auto"
              onClick={() => router.push(`/session/live?id=${activeId}`)}
            >
              Riprendi sessione
            </Button>
          ) : (
            <Button
              type="button"
              variant="accent"
              className="w-full sm:w-auto"
              onClick={startEmpty}
            >
              Sessione libera
            </Button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 border-y border-hairline py-4">
        <Stat label="Streak" value={String(streak)} />
        <Stat label="Sessioni" value={String(completed.length)} />
        <Stat label="Routine" value={String(routines.length)} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold border-b border-hairline pb-2">
          Vai a
        </h2>
        <ul className="divide-y divide-hairline">
          <DashLink href="/catalog" title="Catalogo" subtitle="873 esercizi, filtri, preferiti" />
          <DashLink href="/history" title="Storico" subtitle="Sessioni, streak, ripeti" />
          <DashLink href="/progress" title="Progressi" subtitle="Carichi e peso corporeo" />
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between border-b border-hairline pb-2">
          <h2 className="font-display text-lg font-bold">Avvia routine</h2>
          <Link href="/routines" className="text-sm text-muted hover:text-ink">
            Tutte
          </Link>
        </div>
        {routines.length === 0 ? (
          <EmptyState
            title="Nessuna routine"
            description="Crea la tua prima routine dalla tab Routine."
            action={
              <Link href="/routines/new">
                <Button type="button">Crea routine</Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {routines.slice(0, 5).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-muted">
                    {r.type === "reps" ? "Serie/reps" : "A tempo"} ·{" "}
                    {r.exercises.length} esercizi
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

function DashLink({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 py-3 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted">{subtitle}</div>
        </div>
        <span className="text-muted" aria-hidden>
          →
        </span>
      </Link>
    </li>
  );
}
