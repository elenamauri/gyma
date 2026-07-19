"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/storage";
import type { Routine } from "@/lib/types";
import { createSessionFromRoutine } from "@/components/session/LiveSession";
import { AiRoutineImportPanel } from "@/components/routines/AiRoutineImportPanel";
import { Button, EmptyState } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";

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
    <div className="space-y-6">
      <PageHeader
        description="Serie/reps oppure circuiti a tempo."
        action={
          <Link href="/routines/new">
            <Button type="button">Nuova</Button>
          </Link>
        }
      />

      {routines.length === 0 ? (
        <EmptyState
          title="Nessuna routine salvata"
          description="Crea una routine dal catalogo oppure importane una da Claude."
          action={
            <Link href="/routines/new">
              <Button type="button">Crea la prima</Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {routines.map((r) => (
            <li key={r.id} className="space-y-3 py-4">
              <Link
                href={`/routines/${r.id}`}
                className="block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted">
                  {r.type === "reps" ? "Serie/reps" : "A tempo"} ·{" "}
                  {r.exercises.length} esercizi
                </div>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="accent" onClick={() => start(r)}>
                  Avvia
                </Button>
                <Link href={`/routines/${r.id}/edit`} className="contents">
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
