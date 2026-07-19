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
import {
  displayWeight,
  formatDuration,
  formatWeight,
  storeWeight,
} from "@/lib/units";
import { RestTimerBar } from "@/components/session/RestTimerBar";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { Button, Input, Mono } from "@/components/ui/primitives";

function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
}

function previousSetsForExercise(
  sessions: Session[],
  exerciseId: string,
  currentSessionId: string,
): LoggedSet[] {
  const past = [...sessions]
    .filter((s) => s.id !== currentSessionId && s.status === "completed")
    .sort((a, b) =>
      (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt),
    );
  for (const s of past) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
    const done = ex?.sets.filter((set) => set.completed) ?? [];
    if (done.length) return done;
  }
  return [];
}

function formatPrevSet(set: LoggedSet | undefined, unit: "kg" | "lb"): string {
  if (!set) return "—";
  const w = displayWeight(set.weight, unit);
  if (w !== undefined) return `${formatWeight(w, unit)}${unit} × ${set.reps}`;
  return `${set.reps} rip.`;
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useWakeLock(wakeLockOn && session?.status === "active");

  const startedAt = session?.startedAt;
  const sessionStatus = session?.status;

  useEffect(() => {
    if (!startedAt || sessionStatus !== "active") return;
    const tick = () => {
      setElapsed(
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [session?.id, startedAt, sessionStatus]);

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

  const liveStats = useMemo(() => {
    if (!session) return { volume: 0, setsDone: 0 };
    let volume = 0;
    let setsDone = 0;
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (!set.completed) continue;
        setsDone += 1;
        if (set.weight !== undefined) volume += set.weight * set.reps;
      }
    }
    return { volume, setsDone };
  }, [session]);

  const previousSets = useMemo(() => {
    if (!session || !current) return [];
    return previousSetsForExercise(sessions, current.exerciseId, session.id);
  }, [sessions, session, current]);

  const currentCatalog = useMemo(() => {
    if (!current) return null;
    return catalog.find((e) => e.id === current.exerciseId) ?? null;
  }, [catalog, current]);

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
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(0.5rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-2 py-2">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center text-xl touch-manipulation"
          aria-label="Esci"
          onClick={abandonSession}
        >
          ⌄
        </button>
        <div className="flex flex-1 justify-center text-muted" aria-hidden>
          ⏱
        </div>
        <Button type="button" variant="accent" onClick={finishSession}>
          Fine
        </Button>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2 border border-hairline px-3 py-3">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Durata
          </div>
          <Mono className="text-lg text-accent">{formatElapsed(elapsed)}</Mono>
        </div>
        <div className="border-x border-hairline text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Volume
          </div>
          <Mono className="text-lg">
            {formatWeight(displayWeight(liveStats.volume, settings.unit), settings.unit)}{" "}
            {settings.unit}
          </Mono>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted">Set</div>
          <Mono className="text-lg">{liveStats.setsDone}</Mono>
        </div>
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
        <div className="flex flex-1 flex-col gap-4 pt-2">
          <div className="flex items-start gap-3">
            <ExerciseThumb
              size="sm"
              eager
              exerciseId={current.exerciseId}
              exerciseName={current.exerciseName}
              imagePath={currentCatalog?.images[0]}
              primaryMuscles={current.primaryMuscles}
              secondaryMuscles={currentCatalog?.secondaryMuscles}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h1 className="font-display text-xl font-bold leading-tight tracking-tight">
                  {current.exerciseName}
                </h1>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-muted touch-manipulation"
                  aria-label="Menu esercizio"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  ⋯
                </button>
              </div>
              {menuOpen && (
                <div className="mt-1 flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    className="min-h-10 border border-hairline px-2 text-muted touch-manipulation"
                    onClick={() => {
                      setMenuOpen(false);
                      setPickerMode("replace");
                    }}
                  >
                    Sostituisci
                  </button>
                  <button
                    type="button"
                    className="min-h-10 border border-hairline px-2 text-muted touch-manipulation"
                    onClick={() => {
                      setMenuOpen(false);
                      setPickerMode("add");
                    }}
                  >
                    + Esercizio
                  </button>
                  <button
                    type="button"
                    className="min-h-10 border border-hairline px-2 text-muted touch-manipulation"
                    onClick={() => {
                      setMenuOpen(false);
                      removeCurrentExercise();
                    }}
                  >
                    Rimuovi
                  </button>
                </div>
              )}
              <input
                className="mt-2 w-full border-0 border-b border-hairline bg-transparent py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
                placeholder="Note…"
                value={current.notes ?? ""}
                onChange={(e) => patchCurrent({ notes: e.target.value })}
              />
              <p className="mt-2 text-sm text-muted">
                Timer di recupero:{" "}
                <span className={rest.running ? "text-accent" : ""}>
                  {rest.running
                    ? formatDuration(rest.remaining)
                    : current.restSeconds > 0
                      ? `${current.restSeconds}s`
                      : "Spento"}
                </span>
              </p>
            </div>
          </div>

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
              previousSets={previousSets}
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

          {/* Upcoming queue */}
          {session.exercises.length > 1 && (
            <ul className="mt-2 divide-y divide-hairline border-t border-hairline">
              {session.exercises.map((ex, i) => {
                if (i === exerciseIndex) return null;
                const done = ex.sets.filter((s) => s.completed).length;
                const total = ex.sets.length;
                const cat = catalog.find((c) => c.id === ex.exerciseId);
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 py-3 text-left touch-manipulation"
                      onClick={() => {
                        setExerciseIndex(i);
                        setTimedLeft(null);
                        setTimedRunning(false);
                        setMenuOpen(false);
                      }}
                    >
                      <ExerciseThumb
                        size="sm"
                        exerciseId={ex.exerciseId}
                        exerciseName={ex.exerciseName}
                        imagePath={cat?.images[0]}
                        primaryMuscles={ex.primaryMuscles}
                        className="!h-12 !w-12"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{ex.exerciseName}</div>
                        <div className="text-sm text-muted">
                          {done}/{total} Fatto
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={wakeLockOn}
              onChange={(e) => setWakeLockOn(e.target.checked)}
              className="h-5 w-5 accent-accent"
            />
            Schermo sempre acceso
          </label>
        </div>
      ) : null}

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
  previousSets,
  onCompleteSet,
  onAddSet,
  onUpdateSet,
}: {
  exercise: SessionExercise;
  unit: "kg" | "lb";
  previousSets: LoggedSet[];
  onCompleteSet: (setIndex: number, data: Partial<LoggedSet>) => void;
  onAddSet: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<LoggedSet>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[2rem_1fr_4.5rem_4rem_2.5rem] items-center gap-1.5 px-0.5 text-[10px] uppercase tracking-wide text-muted">
        <span>Set</span>
        <span>Precedente</span>
        <span className="text-center">Kg</span>
        <span className="text-center">Rip.</span>
        <span />
      </div>
      <ul className="space-y-2">
        {exercise.sets.map((set, index) => {
          const displayW = displayWeight(set.weight, unit);
          const prev = previousSets[index];
          return (
            <li
              key={set.id}
              className="grid grid-cols-[2rem_1fr_4.5rem_4rem_2.5rem] items-center gap-1.5"
            >
              <Mono
                className={`text-center text-sm ${
                  set.completed ? "text-accent" : "text-muted"
                }`}
              >
                {index + 1}
              </Mono>
              <span className="truncate text-sm text-muted">
                {formatPrevSet(prev, unit)}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                disabled={set.completed}
                className="h-10 px-1 text-center font-mono text-base"
                value={displayW ?? ""}
                onChange={(e) => {
                  const v =
                    e.target.value === "" ? undefined : Number(e.target.value);
                  onUpdateSet(index, { weight: storeWeight(v, unit) });
                }}
              />
              <Input
                type="number"
                inputMode="numeric"
                disabled={set.completed}
                className="h-10 px-1 text-center font-mono text-base"
                value={set.reps}
                onChange={(e) =>
                  onUpdateSet(index, { reps: Number(e.target.value) || 0 })
                }
              />
              <button
                type="button"
                disabled={set.completed}
                aria-label={set.completed ? "Serie completata" : "Completa serie"}
                className={`flex h-10 w-10 items-center justify-center touch-manipulation ${
                  set.completed
                    ? "bg-accent text-chalk"
                    : "border border-hairline text-muted"
                }`}
                onClick={() =>
                  onCompleteSet(index, {
                    reps: set.reps,
                    weight: set.weight,
                    rpe: set.rpe,
                  })
                }
              >
                ✓
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-center bg-ink/[0.04] text-sm font-medium touch-manipulation"
        onClick={onAddSet}
      >
        + Aggiungi serie
      </button>
    </div>
  );
}

export function getActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}
