"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/storage";
import type { Routine } from "@/lib/types";
import {
  createSessionFromRoutine,
} from "@/components/session/LiveSession";
import { AiRoutineImportPanel } from "@/components/routines/AiRoutineImportPanel";
import { Button, EmptyState } from "@/components/ui/primitives";

export default function RoutinesPage() {
  const router = useRouter();
  const { routines, upsertRoutine, deleteRoutine, upsertSession } = useAppStore();

  function start(routine: Routine) {
    const session = createSessionFromRoutine(routine);
    upsertSession(session);
    router.push(`/session/live?id=${session.id}`);
  }

  function duplicate(routine: Routine) {
    const now = new Date().toISOString();
    const copy: Routine = {
      ...routine,
      id: uid(),
      name: `${routine.name} (copia)`,
      createdAt: now,
      updatedAt: now,
      exercises: routine.exercises.map((ex) => ({
        ...ex,
        id: uid(),
      })) as Routine["exercises"],
    };
    upsertRoutine(copy);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Routine</h1>
          <p className="mt-1 text-sm text-muted">
            Serie/reps oppure circuiti a tempo.
          </p>
        </div>
        <Link href="/routines/new">
          <Button type="button">Nuova routine</Button>
        </Link>
      </div>

      {routines.length === 0 ? (
        <EmptyState
          title="Nessuna routine salvata"
          description="Crea una routine dal catalogo oppure importane una generata da Claude."
          action={
            <Link href="/routines/new">
              <Button type="button">Crea la prima routine</Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {routines.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link
                  href={`/routines/${r.id}`}
                  className="font-medium hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {r.name}
                </Link>
                <div className="text-xs text-muted">
                  {r.type === "reps" ? "Serie/reps" : "A tempo"} · {r.exercises.length}{" "}
                  esercizi
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => start(r)}>
                  Avvia
                </Button>
                <Link href={`/routines/${r.id}/edit`}>
                  <Button type="button" variant="ghost">
                    Modifica
                  </Button>
                </Link>
                <Button type="button" variant="ghost" onClick={() => duplicate(r)}>
                  Duplica
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    if (confirm(`Eliminare “${r.name}”?`)) deleteRoutine(r.id);
                  }}
                >
                  Elimina
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AiRoutineImportPanel />
    </div>
  );
}
