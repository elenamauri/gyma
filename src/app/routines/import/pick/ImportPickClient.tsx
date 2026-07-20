"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { useAppStore } from "@/lib/store";
import { filterExercises, type CatalogFilters } from "@/lib/exercises";
import type { ExerciseIndexEntry } from "@/lib/types";
import {
  loadImportDraft,
  saveImportDraft,
  updateImportExercisePick,
} from "@/lib/import-draft";
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

export default function ImportPickClient() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("return") || "/routines/import";
  const routineIndex = Number(params.get("routine") ?? "0");
  const exerciseIndex = Number(params.get("row") ?? "0");
  const { recentExerciseIds } = useAppStore();
  const { exercises, fuse, loading } = useExerciseCatalog();
  const [query, setQuery] = useState("");
  const [muscleChip, setMuscleChip] = useState("all");
  const [importedName, setImportedName] = useState<string | null>(null);

  useEffect(() => {
    const draft = loadImportDraft();
    if (!draft) {
      router.replace(returnTo);
      return;
    }
    let name: string | null = null;
    if (draft.mode === "routine" && draft.routine) {
      name = draft.routine.exercises[exerciseIndex]?.importedName ?? null;
    } else if (draft.mode === "program" && draft.program) {
      name =
        draft.program.routines[routineIndex]?.exercises[exerciseIndex]
          ?.importedName ?? null;
    }
    setImportedName(name);
    if (name) setQuery(name);
  }, [returnTo, router, routineIndex, exerciseIndex]);

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
    const draft = loadImportDraft();
    if (!draft) {
      router.replace(returnTo);
      return;
    }
    const next = updateImportExercisePick(
      draft,
      routineIndex,
      exerciseIndex,
      { id: ex.id, name: ex.name },
    );
    saveImportDraft(next);
    router.push(returnTo);
  }

  if (loading) {
    return <p className="text-sm text-muted">Caricamento catalogo…</p>;
  }

  return (
    <div className="space-y-4 pb-8">
      {importedName && (
        <p className="text-sm text-muted">
          Abbinamento per:{" "}
          <span className="font-mono text-ink">{importedName}</span>
        </p>
      )}

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
          filtered.slice(0, 80).map((ex) => (
            <li key={ex.id}>
              <CatalogRow ex={ex} onSelect={() => selectExercise(ex)} />
            </li>
          ))
        )}
      </ul>

      <Button type="button" variant="ghost" className="w-full" onClick={() => router.push(returnTo)}>
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
