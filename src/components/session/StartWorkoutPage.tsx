"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { Routine } from "@/lib/types";
import {
  createEmptySession,
  createSessionFromRoutine,
} from "@/components/session/LiveSession";
import { Button, EmptyState } from "@/components/ui/primitives";

const FREQUENT_LIMIT = 5;

export function StartWorkoutPage() {
  const router = useRouter();
  const { ready, programs, routines, sessions, upsertSession } = useAppStore();

  const frequent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (s.status !== "completed" || !s.routineId) continue;
      counts.set(s.routineId, (counts.get(s.routineId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => {
        const routine = routines.find((r) => r.id === id);
        return routine ? { routine, count } : null;
      })
      .filter((x): x is { routine: Routine; count: number } => x != null)
      .slice(0, FREQUENT_LIMIT);
  }, [sessions, routines]);

  const grouped = useMemo(() => {
    const programOrder = [...programs].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return programOrder
      .map((program) => ({
        program,
        routines: routines
          .filter((r) => r.programId === program.id)
          .sort((a, b) => a.name.localeCompare(b.name, "it")),
      }))
      .filter((g) => g.routines.length > 0);
  }, [programs, routines]);

  function startRoutine(routine: Routine) {
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
    <div className="space-y-8 pb-8">
      <section>
        <Button
          type="button"
          variant="accent"
          className="w-full"
          onClick={startEmpty}
        >
          Sessione libera
        </Button>
      </section>

      {frequent.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold border-b border-hairline pb-2">
            Frequenti
          </h2>
          <ul className="divide-y divide-hairline">
            {frequent.map(({ routine, count }) => (
              <RoutineStartRow
                key={routine.id}
                routine={routine}
                meta={`${count} ${count === 1 ? "volta" : "volte"}`}
                onStart={() => startRoutine(routine)}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-5">
        <div className="flex items-end justify-between border-b border-hairline pb-2">
          <h2 className="font-display text-lg font-bold">Tutte le routine</h2>
          <Link
            href="/routines"
            className="text-xs text-muted hover:text-ink"
          >
            Programmi
          </Link>
        </div>

        {grouped.length === 0 ? (
          <EmptyState
            title="Nessuna routine"
            description="Crea un programma e aggiungi le routine."
            action={
              <Link href="/routines/programs/new">
                <Button type="button">Crea programma</Button>
              </Link>
            }
          />
        ) : (
          grouped.map(({ program, routines: list }) => (
            <div key={program.id} className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-wide text-muted">
                {program.name}
              </div>
              <ul className="divide-y divide-hairline">
                {list.map((r) => (
                  <RoutineStartRow
                    key={r.id}
                    routine={r}
                    onStart={() => startRoutine(r)}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function RoutineStartRow({
  routine,
  meta,
  onStart,
}: {
  routine: Routine;
  meta?: string;
  onStart: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onStart}
        className="flex w-full items-center gap-3 py-3 text-left touch-manipulation hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span
          className="h-9 w-9 shrink-0 border border-hairline"
          style={{ backgroundColor: routine.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{routine.name}</div>
          <div className="text-xs text-muted">
            {routine.type === "reps" ? "Serie/reps" : "A tempo"} ·{" "}
            {routine.exercises.length} esercizi
            {meta ? ` · ${meta}` : ""}
          </div>
        </div>
        <span className="shrink-0 text-sm text-accent">Avvia</span>
      </button>
    </li>
  );
}
