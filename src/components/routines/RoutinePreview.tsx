"use client";

import { useMemo, useState } from "react";
import type {
  ExerciseIndexEntry,
  Routine,
  RoutineExerciseReps,
  RoutineExerciseTimed,
} from "@/lib/types";
import { Mono } from "@/components/ui/primitives";
import { MuscleMap } from "@/components/exercises/MuscleMap";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";

export function useRoutineStats(
  routine: Pick<Routine, "type" | "exercises"> | null | undefined,
  catalog: ExerciseIndexEntry[],
) {
  return useMemo(() => {
    if (!routine) {
      return { sets: 0, durationMin: 0, primary: [] as string[], secondary: [] as string[] };
    }
    if (routine.type === "reps") {
      const list = routine.exercises as RoutineExerciseReps[];
      const sets = list.reduce((s, e) => s + e.sets, 0);
      const durationMin = Math.round(
        list.reduce((s, e) => s + e.sets * (45 + e.restSeconds), 0) / 60,
      );
      const primary: string[] = [];
      const secondary: string[] = [];
      for (const ex of list) {
        const cat = catalog.find((c) => c.id === ex.exerciseId);
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
      const cat = catalog.find((c) => c.id === ex.exerciseId);
      if (!cat) continue;
      primary.push(...cat.primaryMuscles);
      secondary.push(...cat.secondaryMuscles);
    }
    return { sets: list.length, durationMin, primary, secondary };
  }, [routine, catalog]);
}

function formatDurationMin(min: number) {
  if (min < 60) return `~${min}m`;
  return `~${Math.floor(min / 60)}h ${min % 60}m`;
}

/**
 * Accordion header + optional summary (sets / duration / muscle map).
 * Closed by default — matches Hevy-style routine preview.
 */
export function RoutineAccordion({
  name,
  subtitle,
  stats,
  defaultOpen = false,
}: {
  name: string;
  subtitle?: string;
  stats: {
    sets: number;
    durationMin: number;
    primary: string[];
    secondary: string[];
  };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left touch-manipulation"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {name}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        <span
          className={`mt-2 text-xl text-muted transition-transform ${
            open ? "rotate-0" : "-rotate-90"
          }`}
          aria-hidden
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-3 items-center gap-2 border border-hairline px-3 py-4">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Set
            </div>
            <Mono className="text-2xl">{stats.sets}</Mono>
          </div>
          <div className="border-x border-hairline text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Durata
            </div>
            <Mono className="text-lg">
              {formatDurationMin(stats.durationMin)}
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
      )}
    </div>
  );
}

export function RoutineExerciseList({
  type,
  exercises,
  catalog,
  editingId,
  onSelect,
  onChangeReps,
  onChangeTimed,
  onRemove,
  weightUnit = "kg",
}: {
  type: Routine["type"];
  exercises: Routine["exercises"];
  catalog: ExerciseIndexEntry[];
  editingId?: string | null;
  onSelect?: (exerciseId: string) => void;
  onChangeReps?: (id: string, patch: Partial<RoutineExerciseReps>) => void;
  onChangeTimed?: (id: string, patch: Partial<RoutineExerciseTimed>) => void;
  onRemove?: (id: string) => void;
  weightUnit?: "kg" | "lb";
}) {
  if (type === "reps") {
    return (
      <ul className="divide-y divide-hairline">
        {(exercises as RoutineExerciseReps[]).map((ex) => {
          const cat = catalog.find((c) => c.id === ex.exerciseId);
          const open = editingId === ex.id;
          return (
            <li key={ex.id} className="py-3">
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left touch-manipulation"
                onClick={() => onSelect?.(ex.id)}
                disabled={!onSelect}
              >
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
                  {!open && (
                    <div className="text-sm text-muted">
                      {ex.sets} set · {ex.reps} rip.
                      {ex.targetWeight !== undefined
                        ? ` · ${ex.targetWeight}`
                        : ""}
                    </div>
                  )}
                </div>
                {onSelect ? (
                  <span
                    className={`text-lg text-muted transition-transform ${
                      open ? "rotate-0" : "-rotate-90"
                    }`}
                    aria-hidden
                  >
                    ⌄
                  </span>
                ) : null}
              </button>

              {open && onChangeReps && (
                <div className="mt-3 space-y-3 pl-[calc(3.5rem+0.75rem)]">
                  <input
                    className="w-full border-0 border-b border-hairline bg-transparent py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
                    placeholder="Note…"
                    value={ex.notes ?? ""}
                    onChange={(e) =>
                      onChangeReps(ex.id, { notes: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-4 items-center gap-0 border border-hairline">
                    <CompactField
                      label="Set"
                      value={ex.sets}
                      onChange={(v) => onChangeReps(ex.id, { sets: v })}
                    />
                    <CompactField
                      label="Rip."
                      value={ex.reps}
                      onChange={(v) => onChangeReps(ex.id, { reps: v })}
                      className="border-l border-hairline"
                    />
                    <CompactField
                      label={weightUnit}
                      value={ex.targetWeight ?? ""}
                      optional
                      onChange={(v) =>
                        onChangeReps(ex.id, {
                          targetWeight: v || undefined,
                        })
                      }
                      className="border-l border-hairline"
                    />
                    <CompactField
                      label="Rec."
                      value={ex.restSeconds}
                      onChange={(v) =>
                        onChangeReps(ex.id, { restSeconds: v })
                      }
                      className="border-l border-hairline"
                    />
                  </div>
                  {onRemove ? (
                    <button
                      type="button"
                      className="text-sm text-accent touch-manipulation"
                      onClick={() => onRemove(ex.id)}
                    >
                      Rimuovi
                    </button>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-hairline">
      {(exercises as RoutineExerciseTimed[]).map((ex) => {
        const cat = catalog.find((c) => c.id === ex.exerciseId);
        const open = editingId === ex.id;
        return (
          <li key={ex.id} className="py-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 text-left touch-manipulation"
              onClick={() => onSelect?.(ex.id)}
              disabled={!onSelect}
            >
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
                {!open && (
                  <div className="text-sm text-muted">
                    {ex.durationSeconds}s · recupero {ex.restSeconds}s
                  </div>
                )}
              </div>
              {onSelect ? (
                <span
                  className={`text-lg text-muted transition-transform ${
                    open ? "rotate-0" : "-rotate-90"
                  }`}
                  aria-hidden
                >
                  ⌄
                </span>
              ) : null}
            </button>

            {open && onChangeTimed && (
              <div className="mt-3 space-y-3 pl-[calc(3.5rem+0.75rem)]">
                <div className="grid grid-cols-2 items-center gap-0 border border-hairline">
                  <CompactField
                    label="Durata"
                    value={ex.durationSeconds}
                    onChange={(v) =>
                      onChangeTimed(ex.id, { durationSeconds: v })
                    }
                  />
                  <CompactField
                    label="Rec."
                    value={ex.restSeconds}
                    onChange={(v) =>
                      onChangeTimed(ex.id, { restSeconds: v })
                    }
                    className="border-l border-hairline"
                  />
                </div>
                {onRemove ? (
                  <button
                    type="button"
                    className="text-sm text-accent touch-manipulation"
                    onClick={() => onRemove(ex.id)}
                  >
                    Rimuovi
                  </button>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CompactField({
  label,
  value,
  onChange,
  optional,
  className = "",
}: {
  label: string;
  value: number | "";
  onChange: (v: number) => void;
  optional?: boolean;
  className?: string;
}) {
  return (
    <div className={`px-2 py-2.5 text-center ${className}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <input
        type="number"
        inputMode="decimal"
        min={optional ? 0 : 1}
        step="any"
        value={value}
        onChange={(e) => {
          const n = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(n);
        }}
        className="mt-0.5 w-full bg-transparent text-center font-mono text-lg outline-none focus:text-accent"
      />
    </div>
  );
}
