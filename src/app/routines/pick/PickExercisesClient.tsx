"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { useAppStore } from "@/lib/store";
import {
  filterExercises,
  getExerciseById,
  type CatalogFilters,
} from "@/lib/exercises";
import type { Exercise, ExerciseIndexEntry } from "@/lib/types";
import {
  addExerciseToDraft,
  draftExerciseCount,
  draftHasExercise,
  loadDraft,
  removeExerciseFromDraft,
  type RoutineDraft,
} from "@/lib/routine-draft";
import { MuscleMap } from "@/components/exercises/MuscleMap";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { Button, Input, Mono } from "@/components/ui/primitives";

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
  "middle back": "Schiena",
  "lower back": "Schiena",
  shoulders: "Spalle",
  biceps: "Bicipiti",
  triceps: "Tricipiti",
  abdominals: "Addome",
  quadriceps: "Quadricipiti",
  hamstrings: "Femorali",
  glutes: "Glutei",
  calves: "Polpacci",
  traps: "Trapezi",
  forearms: "Avambracci",
  neck: "Collo",
  adductors: "Adduttori",
  abductors: "Abduttori",
};

function muscleLabel(ex: ExerciseIndexEntry) {
  const m = ex.primaryMuscles[0] ?? "";
  return IT_MUSCLE[m] ?? m;
}

export default function PickExercisesClient() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("return") || "/routines/new";
  const { settings, recentExerciseIds, favorites, toggleFavorite } =
    useAppStore();
  const { exercises, fuse, loading } = useExerciseCatalog();
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [query, setQuery] = useState("");
  const [muscleChip, setMuscleChip] = useState("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewFull, setPreviewFull] = useState<Exercise | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (!d) {
      router.replace(returnTo);
      return;
    }
    setDraft(d);
  }, [returnTo, router]);

  useEffect(() => {
    if (!previewId) {
      setPreviewFull(null);
      return;
    }
    let cancelled = false;
    getExerciseById(previewId).then((ex) => {
      if (!cancelled) setPreviewFull(ex ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [previewId]);

  const chipFilter = MUSCLE_CHIPS.find((c) => c.id === muscleChip)?.filter ?? "";

  const filters: CatalogFilters = useMemo(
    () => ({
      query,
      primaryMuscle:
        chipFilter === "lats"
          ? "" // special: filter multiple back muscles below
          : chipFilter,
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

  const recentItems = useMemo(() => {
    return recentExerciseIds
      .map((id) => exercises.find((e) => e.id === id))
      .filter(Boolean) as ExerciseIndexEntry[];
  }, [recentExerciseIds, exercises]);

  const showRecent =
    !query && muscleChip === "all" && recentItems.length > 0;

  function add(ex: ExerciseIndexEntry) {
    if (!draft || draftHasExercise(draft, ex.id)) return;
    setDraft(addExerciseToDraft(draft, ex, settings.defaultRestSeconds));
  }

  function remove(exId: string) {
    if (!draft) return;
    setDraft(removeExerciseFromDraft(draft, exId));
  }

  if (loading || !draft) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  const count = draftExerciseCount(draft);
  const previewIndex = previewId
    ? exercises.find((e) => e.id === previewId)
    : null;

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Cerca esercizio…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          className="min-w-0 flex-1"
        />
        <Mono className="min-w-[2ch] shrink-0 text-sm text-accent">{count}</Mono>
      </div>

      {/* Muscle carousel */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-3 pb-1">
          {MUSCLE_CHIPS.map((chip) => {
            const active = muscleChip === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setMuscleChip(chip.id)}
                className={`flex w-16 shrink-0 flex-col items-center gap-1 touch-manipulation ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center border text-[10px] uppercase ${
                    active
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-hairline bg-ink/[0.02] text-muted"
                  }`}
                >
                  {chip.id === "all" ? "★" : chip.label.slice(0, 3)}
                </span>
                <span className="text-[10px] uppercase tracking-wide">
                  {chip.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showRecent && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted">Eseguito di recente</h2>
          <ExerciseGrid
            items={recentItems.slice(0, 6)}
            draft={draft}
            favorites={favorites}
            onPreview={setPreviewId}
            onAdd={add}
            onRemove={remove}
            onToggleFav={toggleFavorite}
          />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-muted">
            {showRecent ? "Catalogo" : "Esercizi"}
          </h2>
          <Mono className="text-xs text-muted">{filtered.length}</Mono>
        </div>
        <ExerciseGrid
          items={filtered}
          draft={draft}
          favorites={favorites}
          onPreview={setPreviewId}
          onAdd={add}
          onRemove={remove}
          onToggleFav={toggleFavorite}
        />
      </section>

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] inset-x-0 z-30 border-t border-hairline bg-chalk/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Button
            type="button"
            variant="accent"
            className="w-full"
            onClick={() => router.push(returnTo)}
          >
            Fatto · {count} selezionati
          </Button>
        </div>
      </div>

      {previewId && previewIndex && (
        <PreviewSheet
          indexEntry={previewIndex}
          full={previewFull}
          selected={draftHasExercise(draft, previewId)}
          onClose={() => setPreviewId(null)}
          onAdd={() => add(previewIndex)}
          onRemove={() => remove(previewId)}
        />
      )}
    </div>
  );
}

function ExerciseGrid({
  items,
  draft,
  favorites,
  onPreview,
  onAdd,
  onRemove,
  onToggleFav,
}: {
  items: ExerciseIndexEntry[];
  draft: RoutineDraft;
  favorites: string[];
  onPreview: (id: string) => void;
  onAdd: (ex: ExerciseIndexEntry) => void;
  onRemove: (id: string) => void;
  onToggleFav: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map((ex) => {
        const selected = draftHasExercise(draft, ex.id);
        const fav = favorites.includes(ex.id);
        return (
          <li key={ex.id} className="border border-hairline bg-ink/[0.02]">
            <div className="relative aspect-square border-b border-hairline bg-chalk">
              <button
                type="button"
                className="absolute inset-0 touch-manipulation"
                onClick={() => onPreview(ex.id)}
                aria-label={`Anteprima ${ex.name}`}
              >
                <ExerciseThumb
                  exerciseId={ex.id}
                  exerciseName={ex.name}
                  imagePath={ex.images[0]}
                  primaryMuscles={ex.primaryMuscles}
                  secondaryMuscles={ex.secondaryMuscles}
                  size="md"
                  className="!border-0 h-full w-full"
                />
              </button>
              <button
                type="button"
                aria-label={fav ? "Rimuovi preferito" : "Preferito"}
                onClick={() => onToggleFav(ex.id)}
                className={`absolute left-1 top-1 z-10 flex h-8 w-8 items-center justify-center text-sm touch-manipulation ${
                  fav ? "text-accent" : "text-muted"
                }`}
              >
                {fav ? "★" : "☆"}
              </button>
              <button
                type="button"
                aria-label="Dettagli"
                onClick={() => onPreview(ex.id)}
                className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center text-sm text-muted touch-manipulation"
              >
                ?
              </button>
            </div>
            <div className="space-y-2 p-2">
              <button
                type="button"
                onClick={() => onPreview(ex.id)}
                className="w-full text-left touch-manipulation"
              >
                <div className="line-clamp-2 text-sm font-medium leading-snug">
                  {ex.name}
                </div>
                <div className="text-xs text-muted">{muscleLabel(ex)}</div>
              </button>
              {selected ? (
                <button
                  type="button"
                  onClick={() => onRemove(ex.id)}
                  className="flex h-9 w-full items-center justify-center border border-accent text-xs text-accent touch-manipulation"
                >
                  Aggiunto ✓
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onAdd(ex)}
                  className="flex h-9 w-full items-center justify-center border border-hairline text-xs touch-manipulation"
                >
                  + Aggiungi
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PreviewSheet({
  indexEntry,
  full,
  selected,
  onClose,
  onAdd,
  onRemove,
}: {
  indexEntry: ExerciseIndexEntry;
  full: Exercise | null;
  selected: boolean;
  onClose: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const primary = full?.primaryMuscles ?? indexEntry.primaryMuscles;
  const secondary = full?.secondaryMuscles ?? indexEntry.secondaryMuscles;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Chiudi"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        className="relative z-10 max-h-[88dvh] w-full max-w-lg overflow-auto bg-chalk p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="font-display text-xl font-bold leading-tight">
            {indexEntry.name}
          </h3>
          <Button type="button" variant="ghost" onClick={onClose}>
            Chiudi
          </Button>
        </div>
        <ExerciseThumb
          eager
          size="lg"
          exerciseId={indexEntry.id}
          exerciseName={indexEntry.name}
          imagePath={full?.images?.[0] ?? indexEntry.images[0]}
          primaryMuscles={primary}
          secondaryMuscles={secondary}
          className="mb-3"
        />
        <div className="mb-4 border border-hairline bg-ink/[0.03] py-3">
          <MuscleMap primaryMuscles={primary} secondaryMuscles={secondary} />
        </div>
        <p className="text-center text-sm text-muted">
          {muscleLabel(indexEntry)}
          {indexEntry.equipment ? ` · ${indexEntry.equipment}` : ""}
        </p>
        <p className="mt-1 text-center text-[10px] text-muted">
          Demo GIF: ExerciseDB / AscendAPI
        </p>
        {full?.instructions?.length ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            {full.instructions.slice(0, 4).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        ) : null}
        <div className="mt-6">
          {selected ? (
            <Button type="button" variant="danger" className="w-full" onClick={onRemove}>
              Rimuovi
            </Button>
          ) : (
            <Button type="button" variant="accent" className="w-full" onClick={onAdd}>
              + Aggiungi alla routine
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
