"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ExerciseIndexEntry,
  Routine,
  RoutineExerciseReps,
  RoutineExerciseTimed,
  RoutineType,
} from "@/lib/types";
import { uid } from "@/lib/storage";
import { filterExercises } from "@/lib/exercises";
import { useAppStore } from "@/lib/store";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui/primitives";

export function RoutineForm({
  initial,
}: {
  initial?: Routine;
}) {
  const router = useRouter();
  const { upsertRoutine, settings } = useAppStore();
  const { exercises, fuse, loading } = useExerciseCatalog();

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<RoutineType>(initial?.type ?? "reps");
  const [repsExercises, setRepsExercises] = useState<RoutineExerciseReps[]>(
    initial?.type === "reps"
      ? (initial.exercises as RoutineExerciseReps[])
      : [],
  );
  const [timedExercises, setTimedExercises] = useState<RoutineExerciseTimed[]>(
    initial?.type === "timed"
      ? (initial.exercises as RoutineExerciseTimed[])
      : [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const pickerResults = useMemo(() => {
    if (!pickerOpen) return [];
    return filterExercises(
      exercises,
      {
        query,
        primaryMuscle: "",
        equipment: "",
        level: "",
        category: "",
      },
      fuse ?? undefined,
    ).slice(0, 40);
  }, [pickerOpen, exercises, query, fuse]);

  const list = type === "reps" ? repsExercises : timedExercises;

  function addExercise(ex: ExerciseIndexEntry) {
    if (type === "reps") {
      setRepsExercises((prev) => [
        ...prev,
        {
          id: uid(),
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets: 3,
          reps: 10,
          restSeconds: settings.defaultRestSeconds,
        },
      ]);
    } else {
      setTimedExercises((prev) => [
        ...prev,
        {
          id: uid(),
          exerciseId: ex.id,
          exerciseName: ex.name,
          durationSeconds: 40,
          restSeconds: 20,
        },
      ]);
    }
    setPickerOpen(false);
    setQuery("");
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    if (type === "reps") {
      setRepsExercises((prev) => {
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    } else {
      setTimedExercises((prev) => {
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    }
  }

  function removeAt(index: number) {
    if (type === "reps") {
      setRepsExercises((prev) => prev.filter((_, i) => i !== index));
    } else {
      setTimedExercises((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function save() {
    if (!name.trim() || list.length === 0) return;
    const now = new Date().toISOString();
    const routine: Routine = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      type,
      exercises: type === "reps" ? repsExercises : timedExercises,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    upsertRoutine(routine);
    router.push("/routines");
  }

  if (loading) {
    return <p className="text-sm text-muted">Caricamento catalogo…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rname">Nome routine</Label>
          <Input
            id="rname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push A, Full body, HIIT core…"
          />
        </div>
        <div>
          <Label htmlFor="rtype">Tipo</Label>
          <Select
            id="rtype"
            value={type}
            onChange={(e) => {
              const next = e.target.value as RoutineType;
              setType(next);
            }}
            disabled={!!initial}
          >
            <option value="reps">Serie / reps</option>
            <option value="timed">A tempo (circuito)</option>
          </Select>
          {initial && (
            <p className="mt-1 text-xs text-muted">
              Il tipo non è modificabile dopo la creazione. Duplica per cambiarlo.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between border-b border-hairline pb-2">
          <h2 className="font-display text-lg font-bold">Esercizi</h2>
          <Button type="button" variant="ghost" onClick={() => setPickerOpen(true)}>
            + Aggiungi
          </Button>
        </div>

        {list.length === 0 ? (
          <EmptyState
            title="Nessun esercizio"
            description="Aggiungi esercizi dal catalogo per costruire la routine."
            action={
              <Button type="button" onClick={() => setPickerOpen(true)}>
                Scegli esercizi
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {type === "reps"
              ? repsExercises.map((ex, index) => (
                  <li key={ex.id} className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{ex.exerciseName}</div>
                        <div className="text-xs text-muted">#{index + 1}</div>
                      </div>
                      <div className="flex gap-1">
                        <IconBtn label="Su" onClick={() => move(index, -1)}>
                          ↑
                        </IconBtn>
                        <IconBtn label="Giù" onClick={() => move(index, 1)}>
                          ↓
                        </IconBtn>
                        <IconBtn label="Rimuovi" onClick={() => removeAt(index)}>
                          ×
                        </IconBtn>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <NumField
                        label="Serie"
                        value={ex.sets}
                        onChange={(v) =>
                          setRepsExercises((prev) =>
                            prev.map((p, i) =>
                              i === index ? { ...p, sets: v } : p,
                            ),
                          )
                        }
                      />
                      <NumField
                        label="Reps"
                        value={ex.reps}
                        onChange={(v) =>
                          setRepsExercises((prev) =>
                            prev.map((p, i) =>
                              i === index ? { ...p, reps: v } : p,
                            ),
                          )
                        }
                      />
                      <NumField
                        label={`Peso (${settings.unit})`}
                        value={ex.targetWeight ?? ""}
                        optional
                        onChange={(v) =>
                          setRepsExercises((prev) =>
                            prev.map((p, i) =>
                              i === index
                                ? { ...p, targetWeight: v || undefined }
                                : p,
                            ),
                          )
                        }
                      />
                      <NumField
                        label="Recupero s"
                        value={ex.restSeconds}
                        onChange={(v) =>
                          setRepsExercises((prev) =>
                            prev.map((p, i) =>
                              i === index ? { ...p, restSeconds: v } : p,
                            ),
                          )
                        }
                      />
                    </div>
                    <Textarea
                      placeholder="Note esercizio (opzionale)"
                      rows={2}
                      value={ex.notes ?? ""}
                      onChange={(e) =>
                        setRepsExercises((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, notes: e.target.value } : p,
                          ),
                        )
                      }
                    />
                  </li>
                ))
              : timedExercises.map((ex, index) => (
                  <li key={ex.id} className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{ex.exerciseName}</div>
                        <div className="text-xs text-muted">#{index + 1}</div>
                      </div>
                      <div className="flex gap-1">
                        <IconBtn label="Su" onClick={() => move(index, -1)}>
                          ↑
                        </IconBtn>
                        <IconBtn label="Giù" onClick={() => move(index, 1)}>
                          ↓
                        </IconBtn>
                        <IconBtn label="Rimuovi" onClick={() => removeAt(index)}>
                          ×
                        </IconBtn>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumField
                        label="Durata s"
                        value={ex.durationSeconds}
                        onChange={(v) =>
                          setTimedExercises((prev) =>
                            prev.map((p, i) =>
                              i === index ? { ...p, durationSeconds: v } : p,
                            ),
                          )
                        }
                      />
                      <NumField
                        label="Recupero s"
                        value={ex.restSeconds}
                        onChange={(v) =>
                          setTimedExercises((prev) =>
                            prev.map((p, i) =>
                              i === index ? { ...p, restSeconds: v } : p,
                            ),
                          )
                        }
                      />
                    </div>
                  </li>
                ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3 border-t border-hairline pt-4">
        <Button type="button" onClick={save} disabled={!name.trim() || list.length === 0}>
          Salva routine
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annulla
        </Button>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Scegli esercizio"
            className="max-h-[85dvh] w-full max-w-lg overflow-auto bg-chalk p-4 shadow-none"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Scegli esercizio</h3>
              <Button type="button" variant="ghost" onClick={() => setPickerOpen(false)}>
                Chiudi
              </Button>
            </div>
            <Input
              placeholder="Cerca…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <ul className="mt-3 divide-y divide-hairline">
              {pickerResults.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    className="w-full py-2.5 text-left hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    onClick={() => addExercise(ex)}
                  >
                    <div className="text-sm font-medium">{ex.name}</div>
                    <div className="text-xs text-muted">
                      {ex.primaryMuscles.join(", ")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="border border-hairline px-2 py-1 text-sm text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {children}
    </button>
  );
}

function NumField({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: number | "";
  onChange: (v: number) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        min={optional ? 0 : 1}
        step="any"
        value={value}
        onChange={(e) => {
          const n = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(n);
        }}
        className="font-mono"
      />
    </div>
  );
}
