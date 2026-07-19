"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { createSessionFromRoutine } from "@/components/session/LiveSession";
import type { RoutineExerciseReps, RoutineExerciseTimed } from "@/lib/types";
import { Button, EmptyState, Mono } from "@/components/ui/primitives";

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
    <div className="space-y-6">
      <Link href="/routines" className="text-sm text-muted hover:text-ink">
        ← Routine
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {routine.name}
          </h1>
          <p className="text-sm text-muted">
            {routine.type === "reps" ? "Serie/reps" : "A tempo"} ·{" "}
            {routine.exercises.length} esercizi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="accent" onClick={start}>
            Avvia
          </Button>
          <Link href={`/routines/${routine.id}/edit`}>
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
                  {ex.targetWeight !== undefined ? ` @ ${ex.targetWeight}` : ""} ·{" "}
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
