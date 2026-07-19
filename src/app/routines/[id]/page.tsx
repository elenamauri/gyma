"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { createSessionFromRoutine } from "@/components/session/LiveSession";
import type { RoutineExerciseReps, RoutineExerciseTimed } from "@/lib/types";
import { Button, EmptyState, Mono } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";

export default function RoutineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { routines, upsertSession, deleteRoutine } = useAppStore();
  const routine = routines.find((r) => r.id === id);

  if (!routine) {
    return (
      <EmptyState
        title="Routine non trovata"
        description="Potrebbe essere stata eliminata."
        action={
          <Link href="/routines">
            <Button>Torna alle routine</Button>
          </Link>
        }
      />
    );
  }

  function start() {
    const session = createSessionFromRoutine(routine!);
    upsertSession(session);
    router.push(`/session/live?id=${session.id}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={routine.name}
        description={`${routine.type === "reps" ? "Serie/reps" : "A tempo"} · ${routine.exercises.length} esercizi`}
        backHref="/routines"
        backLabel="Routine"
      />

      <div className="grid grid-cols-1 gap-2">
        <Button type="button" variant="accent" className="w-full" onClick={start}>
          Avvia
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/routines/${routine.id}/edit`} className="contents">
            <Button type="button" variant="ghost">
              Modifica
            </Button>
          </Link>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (confirm("Eliminare questa routine?")) {
                deleteRoutine(routine.id);
                router.push("/routines");
              }
            }}
          >
            Elimina
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-hairline">
        {routine.type === "reps"
          ? (routine.exercises as RoutineExerciseReps[]).map((ex, i) => (
              <li key={ex.id} className="py-3">
                <div className="font-medium">
                  {i + 1}. {ex.exerciseName}
                </div>
                <Mono className="text-sm text-muted">
                  {ex.sets} × {ex.reps}
                  {ex.targetWeight !== undefined ? ` @ ${ex.targetWeight}` : ""} ·
                  recupero {ex.restSeconds}s
                </Mono>
              </li>
            ))
          : (routine.exercises as RoutineExerciseTimed[]).map((ex, i) => (
              <li key={ex.id} className="py-3">
                <div className="font-medium">
                  {i + 1}. {ex.exerciseName}
                </div>
                <Mono className="text-sm text-muted">
                  {ex.durationSeconds}s · recupero {ex.restSeconds}s
                </Mono>
              </li>
            ))}
      </ul>
    </div>
  );
}
