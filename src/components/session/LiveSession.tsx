"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ExerciseIndexEntry,
  LoggedSet,
  Routine,
  RoutineExerciseReps,
  RoutineExerciseTimed,
  Session,
  SessionExercise,
} from "@/lib/types";
import { uid } from "@/lib/storage";
import { detectPRs } from "@/lib/pr";
import {
  alternativesForMuscle,
  filterExercises,
  loadExerciseIndex,
} from "@/lib/exercises";
import { useAppStore } from "@/lib/store";
import { useRestTimer } from "@/hooks/useRestTimer";
import { useWakeLock } from "@/hooks/useWakeLock";
import { displayWeight, formatDuration, formatWeight, storeWeight } from "@/lib/units";
import { RestTimerBar } from "@/components/session/RestTimerBar";
import { Button, Input, Label, Textarea, Mono } from "@/components/ui/primitives";

const ACTIVE_KEY = "gyma:activeSessionId";

export function createSessionFromRoutine(routine: Routine): Session {
  const exercises: SessionExercise[] =
    routine.type === "reps"
      ? (routine.exercises as RoutineExerciseReps[]).map((ex) => ({
          id: uid(),
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          primaryMuscles: [],
          targetSets: ex.sets,
          targetReps: ex.reps,
          targetWeight: ex.targetWeight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          sets: Array.from({ length: ex.sets }, () => ({
            id: uid(),
            reps: ex.reps,
            weight: ex.targetWeight,
            completed: false,
          })),
        }))
      : (routine.exercises as RoutineExerciseTimed[]).map((ex) => ({
          id: uid(),
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          primaryMuscles: [],
          durationSeconds: ex.durationSeconds,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          sets: [
            {
              id: uid(),
              reps: 1,
              completed: false,
            },
          ],
        }));

  return {
    id: uid(),
    routineId: routine.id,
    routineName: routine.name,
    type: routine.type,
    status: "active",
    exercises,
    startedAt: new Date().toISOString(),
  };
}

export function createEmptySession(): Session {
  return {
    id: uid(),
    routineName: "Sessione libera",
    type: "reps",
    status: "active",
    exercises: [],
    startedAt: new Date().toISOString(),
  };
}

export function LiveSessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const {
    sessions,
    upsertSession,
    settings,
    markRecent,
  } = useAppStore();
  const session = sessions.find((s) => s.id === sessionId);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [wakeLockOn, setWakeLockOn] = useState(true);
  const [catalog, setCatalog] = useState<ExerciseIndexEntry[]>([]);
  const [pickerMode, setPickerMode] = useState<"replace" | "add" | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [timedLeft, setTimedLeft] = useState<number | null>(null);
  const [timedRunning, setTimedRunning] = useState(false);

  useWakeLock(wakeLockOn && session?.status === "active");

  const rest = useRestTimer({
    soundEnabled: settings.soundEnabled,
    vibrationEnabled: settings.vibrationEnabled,
  });

  useEffect(() => {
    if (sessionId) localStorage.setItem(ACTIVE_KEY, sessionId);
  }, [sessionId]);

  useEffect(() => {
    loadExerciseIndex().then((idx) => {
      setCatalog(idx.exercises);
      if (!session) return;
      // Enrich primary muscles if missing
      const needs = session.exercises.some((e) => !e.primaryMuscles?.length);
      if (!needs) return;
      const enriched: Session = {
        ...session,
        exercises: session.exercises.map((ex) => {
          if (ex.primaryMuscles?.length) return ex;
          const found = idx.exercises.find((e) => e.id === ex.exerciseId);
          return {
            ...ex,
            primaryMuscles: found?.primaryMuscles ?? [],
          };
        }),
      };
      upsertSession(enriched);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const current = session?.exercises[exerciseIndex];

  // Timed auto-advance
  useEffect(() => {
    if (!session || session.type !== "timed" || !current || !timedRunning) return;
    if (timedLeft === null) return;
    if (timedLeft <= 0) {
      setTimedRunning(false);
      // mark complete and advance
      completeTimedExercise();
      return;
    }
    const id = window.setTimeout(() => setTimedLeft((t) => (t ?? 1) - 1), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedLeft, timedRunning, session?.id, exerciseIndex]);

  const updateSession = useCallback(
    (next: Session) => {
      upsertSession(next);
    },
    [upsertSession],
  );

  function patchCurrent(patch: Partial<SessionExercise>) {
    if (!session || !current) return;
    const exercises = session.exercises.map((ex, i) =>
      i === exerciseIndex ? { ...ex, ...patch } : ex,
    );
    updateSession({ ...session, exercises });
  }

  function completeSet(setIndex: number, data: Partial<LoggedSet>) {
    if (!session || !current) return;
    const sets = current.sets.map((s, i) =>
      i === setIndex
        ? {
            ...s,
            ...data,
            completed: true,
            completedAt: new Date().toISOString(),
          }
        : s,
    );
    const exercises = session.exercises.map((ex, i) =>
      i === exerciseIndex ? { ...ex, sets } : ex,
    );
    updateSession({ ...session, exercises });
    markRecent(current.exerciseId);
    if (current.restSeconds > 0) {
      rest.start(current.restSeconds);
    }
  }

  function addSet() {
    if (!current) return;
    const last = current.sets[current.sets.length - 1];
    patchCurrent({
      sets: [
        ...current.sets,
        {
          id: uid(),
          reps: last?.reps ?? current.targetReps ?? 10,
          weight: last?.weight ?? current.targetWeight,
          completed: false,
        },
      ],
    });
  }

  function completeTimedExercise() {
    if (!session || !current) return;
    const sets = current.sets.map((s) => ({
      ...s,
      completed: true,
      completedAt: new Date().toISOString(),
    }));
    const exercises = session.exercises.map((ex, i) =>
      i === exerciseIndex ? { ...ex, sets } : ex,
    );
    const next = { ...session, exercises };
    updateSession(next);
    markRecent(current.exerciseId);

    if (current.restSeconds > 0 && exerciseIndex < session.exercises.length - 1) {
      rest.start(current.restSeconds);
    }
    if (exerciseIndex < session.exercises.length - 1) {
      setExerciseIndex((i) => i + 1);
      setTimedLeft(null);
      setTimedRunning(false);
    }
  }

  function startTimedBlock() {
    if (!current?.durationSeconds) return;
    setTimedLeft(current.durationSeconds);
    setTimedRunning(true);
  }

  function finishSession() {
    if (!session) return;
    const completed: Session = {
      ...session,
      status: "completed",
      completedAt: new Date().toISOString(),
    };
    const previous = sessions.filter(
      (s) => s.id !== session.id && s.status === "completed",
    );
    completed.prs = detectPRs(completed, previous);
    updateSession(completed);
    localStorage.removeItem(ACTIVE_KEY);
    router.push(`/history/${completed.id}`);
  }

  function abandonSession() {
    if (!session) return;
    updateSession({ ...session, status: "abandoned" });
    localStorage.removeItem(ACTIVE_KEY);
    router.push("/routines");
  }

  const pickerList = useMemo(() => {
    if (!pickerMode || !catalog.length) return [];
    if (pickerMode === "replace" && current) {
      const alts = alternativesForMuscle(
        catalog,
        current.primaryMuscles,
        current.exerciseId,
      );
      return filterExercises(
        alts.length ? alts : catalog,
        {
          query: pickerQuery,
          primaryMuscle: "",
          equipment: "",
          level: "",
          category: "",
        },
      ).slice(0, 50);
    }
    return filterExercises(catalog, {
      query: pickerQuery,
      primaryMuscle: "",
      equipment: "",
      level: "",
      category: "",
    }).slice(0, 50);
  }, [pickerMode, catalog, current, pickerQuery]);

  function applyPick(ex: ExerciseIndexEntry) {
    if (!session) return;
    if (pickerMode === "replace" && current) {
      patchCurrent({
        exerciseId: ex.id,
        exerciseName: ex.name,
        primaryMuscles: ex.primaryMuscles,
        replacedFromId: current.exerciseId,
      });
    } else if (pickerMode === "add") {
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
      updateSession({
        ...session,
        exercises: [...session.exercises, newEx],
      });
      setExerciseIndex(session.exercises.length);
    }
    setPickerMode(null);
    setPickerQuery("");
  }

  function removeCurrentExercise() {
    if (!session || !current) return;
    const exercises = session.exercises.filter((_, i) => i !== exerciseIndex);
    updateSession({ ...session, exercises });
    setExerciseIndex((i) => Math.max(0, Math.min(i, exercises.length - 1)));
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted">Sessione non trovata.</p>
        <Link href="/routines" className="mt-4 inline-block text-accent underline">
          Torna alle routine
        </Link>
      </div>
    );
  }

  if (session.status !== "active") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p>Questa sessione non è più attiva.</p>
        <Link href={`/history/${session.id}`} className="text-accent underline">
          Vedi dettaglio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="mb-4 space-y-3 border-b border-hairline pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-xs font-bold tracking-wide text-muted">
              GYMA · LIVE
            </div>
            <div className="truncate text-sm font-medium">{session.routineName}</div>
          </div>
          <Button type="button" variant="ghost" onClick={abandonSession}>
            Esci
          </Button>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={wakeLockOn}
            onChange={(e) => setWakeLockOn(e.target.checked)}
            className="h-5 w-5 accent-accent"
          />
          Schermo sempre acceso
        </label>
      </div>

      <RestTimerBar
        remaining={rest.remaining}
        progress={rest.progress}
        running={rest.running}
        onSkip={rest.stop}
      />

      {session.exercises.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
          <p className="text-center text-muted">
            Sessione vuota. Aggiungi un esercizio per iniziare.
          </p>
          <Button type="button" onClick={() => setPickerMode("add")}>
            Aggiungi esercizio
          </Button>
        </div>
      ) : current ? (
        <div className="flex flex-1 flex-col gap-6 pt-6">
          <div className="flex items-baseline justify-between gap-2">
            <Mono className="text-sm text-muted">
              {exerciseIndex + 1} / {session.exercises.length}
            </Mono>
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                type="button"
                className="min-h-11 border border-hairline px-3 text-muted hover:text-ink touch-manipulation"
                onClick={() => setPickerMode("replace")}
              >
                Sostituisci
              </button>
              <button
                type="button"
                className="min-h-11 border border-hairline px-3 text-muted hover:text-ink touch-manipulation"
                onClick={() => setPickerMode("add")}
              >
                + Esercizio
              </button>
              <button
                type="button"
                className="min-h-11 border border-hairline px-3 text-muted hover:text-accent touch-manipulation"
                onClick={removeCurrentExercise}
              >
                Rimuovi
              </button>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {current.exerciseName}
          </h1>

          {current.primaryMuscles?.length > 0 && (
            <p className="text-sm text-muted">
              {current.primaryMuscles.join(" · ")}
            </p>
          )}

          {session.type === "timed" ? (
            <TimedBlock
              duration={current.durationSeconds ?? 40}
              left={timedLeft}
              running={timedRunning}
              onStart={startTimedBlock}
              onComplete={completeTimedExercise}
            />
          ) : (
            <SetsBlock
              exercise={current}
              unit={settings.unit}
              onCompleteSet={completeSet}
              onAddSet={addSet}
              onUpdateSet={(setIndex, patch) => {
                const sets = current.sets.map((s, i) =>
                  i === setIndex ? { ...s, ...patch } : s,
                );
                patchCurrent({ sets });
              }}
            />
          )}

          <div>
            <Label htmlFor="ex-notes">Note esercizio</Label>
            <Textarea
              id="ex-notes"
              rows={2}
              placeholder="es. ginocchio fastidioso"
              value={current.notes ?? ""}
              onChange={(e) => patchCurrent({ notes: e.target.value })}
            />
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-4">
            <Button
              type="button"
              variant="ghost"
              disabled={exerciseIndex === 0}
              onClick={() => {
                setExerciseIndex((i) => i - 1);
                setTimedLeft(null);
                setTimedRunning(false);
              }}
            >
              ← Prec
            </Button>
            {exerciseIndex < session.exercises.length - 1 ? (
              <Button
                type="button"
                onClick={() => {
                  setExerciseIndex((i) => i + 1);
                  setTimedLeft(null);
                  setTimedRunning(false);
                }}
              >
                Succ →
              </Button>
            ) : (
              <Button type="button" variant="accent" onClick={finishSession}>
                Termina sessione
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <Label htmlFor="sess-notes">Note sessione</Label>
        <Textarea
          id="sess-notes"
          rows={2}
          value={session.notes ?? ""}
          onChange={(e) => updateSession({ ...session, notes: e.target.value })}
        />
      </div>

      {pickerMode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[85dvh] w-full max-w-lg overflow-auto bg-chalk p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">
                {pickerMode === "replace" ? "Sostituisci esercizio" : "Aggiungi esercizio"}
              </h3>
              <Button type="button" variant="ghost" onClick={() => setPickerMode(null)}>
                Chiudi
              </Button>
            </div>
            {pickerMode === "replace" && current?.primaryMuscles?.length ? (
              <p className="mb-2 text-xs text-muted">
                Alternative per {current.primaryMuscles.join(", ")}
              </p>
            ) : null}
            <Input
              placeholder="Cerca…"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              autoFocus
            />
            <ul className="mt-3 divide-y divide-hairline">
              {pickerList.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    className="w-full py-2.5 text-left hover:text-accent"
                    onClick={() => applyPick(ex)}
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

function TimedBlock({
  duration,
  left,
  running,
  onStart,
  onComplete,
}: {
  duration: number;
  left: number | null;
  running: boolean;
  onStart: () => void;
  onComplete: () => void;
}) {
  const display = left ?? duration;
  const progress = left === null ? 1 : left / duration;

  return (
    <div className="space-y-4 text-center">
      <div className="font-mono text-7xl tabular-nums leading-none tracking-tighter sm:text-8xl">
        {formatDuration(display)}
      </div>
      <div className="mx-auto h-[3px] w-full max-w-sm bg-ink/10">
        <div
          className="h-full bg-accent motion-safe:transition-[width] motion-safe:duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex justify-center gap-3">
        {!running ? (
          <Button type="button" variant="accent" onClick={onStart}>
            Avvia
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onComplete}>
            Completa ora
          </Button>
        )}
      </div>
    </div>
  );
}

function SetsBlock({
  exercise,
  unit,
  onCompleteSet,
  onAddSet,
  onUpdateSet,
}: {
  exercise: SessionExercise;
  unit: "kg" | "lb";
  onCompleteSet: (setIndex: number, data: Partial<LoggedSet>) => void;
  onAddSet: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<LoggedSet>) => void;
}) {
  const activeIndex = exercise.sets.findIndex((s) => !s.completed);
  const focusIndex = activeIndex === -1 ? exercise.sets.length - 1 : activeIndex;

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {exercise.sets.map((set, index) => {
          const isActive = index === focusIndex && !set.completed;
          const displayW = displayWeight(set.weight, unit);
          return (
            <li
              key={set.id}
              className={`border-b border-hairline pb-3 ${
                isActive ? "border-accent" : ""
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-muted">
                  Serie {index + 1}
                  {set.completed ? " · fatta" : isActive ? " · in corso" : ""}
                </span>
                {set.completed && (
                  <Mono className="text-sm text-muted">
                    {set.reps} × {formatWeight(displayW, unit)} {unit}
                    {set.rpe !== undefined ? ` · RPE ${set.rpe}` : ""}
                  </Mono>
                )}
              </div>
              {!set.completed && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Peso ({unit})</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      className={`font-mono text-3xl ${isActive ? "text-accent" : ""}`}
                      value={displayW ?? ""}
                      onChange={(e) => {
                        const v =
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value);
                        onUpdateSet(index, {
                          weight: storeWeight(v, unit),
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Reps</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className={`font-mono text-3xl ${isActive ? "text-accent" : ""}`}
                      value={set.reps}
                      onChange={(e) =>
                        onUpdateSet(index, { reps: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>RPE</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min={1}
                      max={10}
                      className="font-mono text-2xl"
                      value={set.rpe ?? ""}
                      onChange={(e) =>
                        onUpdateSet(index, {
                          rpe:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}
              {!set.completed && isActive && (
                <Button
                  type="button"
                  variant="accent"
                  className="mt-3 w-full"
                  onClick={() =>
                    onCompleteSet(index, {
                      reps: set.reps,
                      weight: set.weight,
                      rpe: set.rpe,
                    })
                  }
                >
                  Conferma serie
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <Button type="button" variant="ghost" onClick={onAddSet}>
        + Aggiungi serie
      </Button>
    </div>
  );
}

export function getActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}
