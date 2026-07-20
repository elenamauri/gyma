"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { useAppStore } from "@/lib/store";
import { filterExercises, type CatalogFilters } from "@/lib/exercises";
import type { ExerciseIndexEntry, SessionExercise } from "@/lib/types";
import { uid } from "@/lib/storage";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { Button, Input } from "@/components/ui/primitives";

const MUSCLE_CHIPS: { id: string; label: string; filter: string }[] = [
  { id: "all", label: "Tutti", filter: "" },
  { id: "chest", label: "Petto", filter: "chest" },
  { id: "back", label: "Schiena", filter: "lats" },
  { id: "shoulders", label: "Spalle", filter: "shoulders" },
  { id: "biceps", label: "Bicipiti", filter: "biceps" },
  { id: "triceps", label: "Tricipiti", filter: "triceps" },
  { id: "abs", label: "Addome", filter: "abdominals" },
  { id: "quads", label: "Quadricipiti", filter: "quadriceps" },
  { id: "hams", label: "Femorali", filter: "hamstrings" },
  { id: "glutes", label: "Glutei", filter: "glutes" },
  { id: "calves", label: "Polpacci", filter: "calves" },
];

const IT_MUSCLE: Record<string, string> = {
  chest: "Petto",
  lats: "Schiena",
  shoulders: "Spalle",
  biceps: "Bicipiti",
  triceps: "Tricipiti",
  abdominals: "Addome",
  quadriceps: "Quadricipiti",
  hamstrings: "Femorali",
  glutes: "Glutei",
  calves: "Polpacci",
};

function muscleLabel(ex: ExerciseIndexEntry) {
  const m = ex.primaryMuscles[0] ?? "";
  return IT_MUSCLE[m] ?? m;
}

export default function SessionPickClient() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("id") ?? "";
  const mode = params.get("mode") === "replace" ? "replace" : "add";
  const exerciseIndex = Number(params.get("index") ?? "0");
  const returnTo = `/session/live?id=${encodeURIComponent(sessionId)}`;

  const { sessions, upsertSession, settings, recentExerciseIds } = useAppStore();
  const { exercises, fuse, loading } = useExerciseCatalog();
  const [query, setQuery] = useState("");
  const [muscleChip, setMuscleChip] = useState("all");

  const session = sessions.find((s) => s.id === sessionId);

  const chipFilter = MUSCLE_CHIPS.find((c) => c.id === muscleChip)?.filter ?? "";

  const filters: CatalogFilters = useMemo(
    () => ({
      query,
      primaryMuscle: chipFilter === "lats" ? "" : chipFilter,
      equipment: "",
      level: "",
      category: "",
    }),
    [query, chipFilter],
  );

  const filtered = useMemo(() => {
    let list = filterExercises(exercises, filters, fuse ?? undefined);
    if (muscleChip === "back") {
      list = list.filter((e) =>
        e.primaryMuscles.some((m) =>
          ["lats", "middle back", "lower back", "traps"].includes(m),
        ),
      );
    }
    return list;
  }, [exercises, filters, fuse, muscleChip]);

  const recent = useMemo(
    () =>
      recentExerciseIds
        .map((id) => exercises.find((e) => e.id === id))
        .filter((e): e is ExerciseIndexEntry => !!e)
        .slice(0, 8),
    [recentExerciseIds, exercises],
  );

  function selectExercise(ex: ExerciseIndexEntry) {
    if (!session || session.status !== "active") {
      router.replace(returnTo);
      return;
    }

    if (mode === "replace") {
      const current = session.exercises[exerciseIndex];
      if (!current) {
        router.replace(returnTo);
        return;
      }
      const exercisesNext = session.exercises.map((item, i) =>
        i === exerciseIndex
          ? {
              ...item,
              exerciseId: ex.id,
              exerciseName: ex.name,
              primaryMuscles: ex.primaryMuscles,
              replacedFromId: current.exerciseId,
            }
          : item,
      );
      upsertSession({
        ...session,
        exercises: exercisesNext,
        activeExerciseIndex: exerciseIndex,
      });
    } else {
      const newEx: SessionExercise = {
        id: uid(),
        exerciseId: ex.id,
        exerciseName: ex.name,
        primaryMuscles: ex.primaryMuscles,
        targetSets: 3,
        targetReps: 10,
        restSeconds: settings.defaultRestSeconds,
        sets: Array.from({ length: 3 }, () => ({
          id: uid(),
          reps: 10,
          completed: false,
        })),
      };
      const exercisesNext = [...session.exercises, newEx];
      upsertSession({
        ...session,
        exercises: exercisesNext,
        activeExerciseIndex: exercisesNext.length - 1,
      });
    }

    router.replace(returnTo);
  }

  if (!sessionId) {
    return <p className="text-sm text-muted">Sessione non specificata.</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted">Caricamento catalogo…</p>;
  }

  if (!session) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Sessione non trovata.</p>
        <Button type="button" onClick={() => router.push("/")}>
          Home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <p className="text-sm text-muted">
        {mode === "replace"
          ? "Scegli l’esercizio sostitutivo dal catalogo."
          : "Aggiungi un esercizio dal catalogo completo."}
      </p>

      <Input
        type="search"
        placeholder="Cerca nel catalogo…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {MUSCLE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setMuscleChip(chip.id)}
            className={`shrink-0 px-3 py-1.5 text-xs uppercase tracking-wide touch-manipulation ${
              muscleChip === chip.id
                ? "bg-ink text-chalk"
                : "border border-hairline text-muted"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {!query.trim() && recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted">Recenti</h2>
          <ul className="divide-y divide-hairline">
            {recent.map((ex) => (
              <li key={ex.id}>
                <CatalogRow ex={ex} onSelect={() => selectExercise(ex)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="divide-y divide-hairline">
        {filtered.length === 0 ? (
          <li className="py-6 text-center text-sm text-muted">
            Nessun esercizio trovato
          </li>
        ) : (
          filtered.slice(0, 100).map((ex) => (
            <li key={ex.id}>
              <CatalogRow ex={ex} onSelect={() => selectExercise(ex)} />
            </li>
          ))
        )}
      </ul>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => router.push(returnTo)}
      >
        Annulla
      </Button>
    </div>
  );
}

function CatalogRow({
  ex,
  onSelect,
}: {
  ex: ExerciseIndexEntry;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 py-3 text-left touch-manipulation hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      <ExerciseThumb
        link={false}
        size="sm"
        exerciseId={ex.id}
        exerciseName={ex.name}
        imagePath={ex.images[0]}
        primaryMuscles={ex.primaryMuscles}
        secondaryMuscles={ex.secondaryMuscles}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{ex.name}</div>
        <div className="text-xs text-muted">
          {muscleLabel(ex)}
          {ex.equipment ? ` · ${ex.equipment}` : ""}
        </div>
      </div>
    </button>
  );
}
