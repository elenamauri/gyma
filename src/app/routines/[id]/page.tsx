"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { createSessionFromRoutine } from "@/components/session/LiveSession";
import type { RoutineExerciseReps, RoutineExerciseTimed } from "@/lib/types";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { Button, EmptyState, Mono } from "@/components/ui/primitives";
import { MuscleMap } from "@/components/exercises/MuscleMap";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";

export default function RoutineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { ready, routines, upsertSession, deleteRoutine } = useAppStore();
  const { exercises } = useExerciseCatalog();
  const routine = routines.find((r) => r.id === id);

  const stats = useMemo(() => {
    if (!routine) return { sets: 0, durationMin: 0, primary: [] as string[], secondary: [] as string[] };
    if (routine.type === "reps") {
      const list = routine.exercises as RoutineExerciseReps[];
      const sets = list.reduce((s, e) => s + e.sets, 0);
      const durationMin = Math.round(
        list.reduce((s, e) => s + e.sets * (45 + e.restSeconds), 0) / 60,
      );
      const primary: string[] = [];
      const secondary: string[] = [];
      for (const ex of list) {
        const cat = exercises.find((c) => c.id === ex.exerciseId);
        if (!cat) continue;
        primary.push(...cat.primaryMuscles);
        secondary.push(...cat.secondaryMuscles);
      }
      return { sets, durationMin, primary, secondary };
    }
    const list = routine.exercises as RoutineExerciseTimed[];
    const durationMin = Math.round(
      list.reduce((s, e) => s + e.durationSeconds + e.restSeconds, 0) / 60,
    );
    const primary: string[] = [];
    const secondary: string[] = [];
    for (const ex of list) {
      const cat = exercises.find((c) => c.id === ex.exerciseId);
      if (!cat) continue;
      primary.push(...cat.primaryMuscles);
      secondary.push(...cat.secondaryMuscles);
    }
    return { sets: list.length, durationMin, primary, secondary };
  }, [routine, exercises]);

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

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

  const updatedLabel = new Date(routine.updatedAt).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-5 pb-28">
      <header className="flex items-center gap-2">
        <Link
          href="/routines"
          className="flex h-11 w-11 items-center justify-center text-lg touch-manipulation"
          aria-label="Indietro"
        >
          ←
        </Link>
        <h1 className="flex-1 text-center font-display text-lg font-bold">Routine</h1>
        <Link
          href={`/routines/${routine.id}/edit`}
          className="flex h-11 items-center px-2 text-sm text-muted touch-manipulation"
        >
          Modifica
        </Link>
      </header>

      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">
          {routine.name}
        </h2>
        <p className="mt-1 text-sm text-muted">Aggiornata {updatedLabel}</p>
      </div>

      {/* Summary strip like reference */}
      <div className="grid grid-cols-3 items-center gap-2 border border-hairline px-3 py-4">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted">Set</div>
          <Mono className="text-2xl">{stats.sets}</Mono>
        </div>
        <div className="border-x border-hairline text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Durata
          </div>
          <Mono className="text-lg">
            ~{stats.durationMin < 60
              ? `${stats.durationMin}m`
              : `${Math.floor(stats.durationMin / 60)}h ${stats.durationMin % 60}m`}
          </Mono>
        </div>
        <div className="flex h-16 items-center justify-center overflow-hidden">
          <MuscleMap
            compact
            primaryMuscles={[...new Set(stats.primary)]}
            secondaryMuscles={[...new Set(stats.secondary)]}
          />
        </div>
      </div>

      <ul className="divide-y divide-hairline">
        {routine.type === "reps"
          ? (routine.exercises as RoutineExerciseReps[]).map((ex) => {
              const cat = exercises.find((c) => c.id === ex.exerciseId);
              return (
                <li key={ex.id} className="flex items-center gap-3 py-3">
                  <ExerciseThumb
                    size="sm"
                    exerciseId={ex.exerciseId}
                    exerciseName={ex.exerciseName}
                    imagePath={cat?.images[0]}
                    primaryMuscles={cat?.primaryMuscles ?? []}
                    secondaryMuscles={cat?.secondaryMuscles ?? []}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{ex.exerciseName}</div>
                    <div className="text-sm text-muted">
                      {ex.sets} set · {ex.reps} rip.
                      {ex.targetWeight !== undefined
                        ? ` · ${ex.targetWeight}`
                        : ""}
                    </div>
                  </div>
                </li>
              );
            })
          : (routine.exercises as RoutineExerciseTimed[]).map((ex) => {
              const cat = exercises.find((c) => c.id === ex.exerciseId);
              return (
                <li key={ex.id} className="flex items-center gap-3 py-3">
                  <ExerciseThumb
                    size="sm"
                    exerciseId={ex.exerciseId}
                    exerciseName={ex.exerciseName}
                    imagePath={cat?.images[0]}
                    primaryMuscles={cat?.primaryMuscles ?? []}
                    secondaryMuscles={cat?.secondaryMuscles ?? []}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{ex.exerciseName}</div>
                    <div className="text-sm text-muted">
                      {ex.durationSeconds}s · recupero {ex.restSeconds}s
                    </div>
                  </div>
                </li>
              );
            })}
      </ul>

      <button
        type="button"
        className="text-sm text-muted underline underline-offset-2"
        onClick={() => {
          if (confirm("Eliminare questa routine?")) {
            deleteRoutine(routine.id);
            router.push("/routines");
          }
        }}
      >
        Elimina routine
      </button>

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] inset-x-0 z-30 border-t border-hairline bg-chalk/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Button type="button" variant="accent" className="w-full" onClick={start}>
            Inizia l&apos;allenamento
          </Button>
        </div>
      </div>
    </div>
  );
}
