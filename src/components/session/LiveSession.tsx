"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  loadExerciseIndex,
} from "@/lib/exercises";
import {
  completeSession,
  formatSessionElapsed,
  getSessionElapsedSeconds,
  initialExerciseIndex,
  isSessionPaused,
  resumeSession,
  setActiveSessionId,
  snapshotLiveSession,
} from "@/lib/session-active";
import {
  playTimedEndSound,
  unlockAudio,
  vibrateTimedEnd,
} from "@/lib/feedback";
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
import { FinishWorkoutModal } from "@/components/session/FinishWorkoutModal";
import { ExitWorkoutModal } from "@/components/session/ExitWorkoutModal";
import { Button, Input, Mono } from "@/components/ui/primitives";

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
    resumedAt: new Date().toISOString(),
    pausedElapsedSeconds: 0,
  };
}

export function createEmptySession(): Session {
  const now = new Date().toISOString();
  return {
    id: uid(),
    routineName: "Sessione libera",
    type: "reps",
    status: "active",
    exercises: [],
    startedAt: now,
    resumedAt: now,
    pausedElapsedSeconds: 0,
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
  const [catalog, setCatalog] = useState<ExerciseIndexEntry[]>([]);
  const [timedLeft, setTimedLeft] = useState<number | null>(null);
  const [timedRunning, setTimedRunning] = useState(false);
  const timedEndAtRef = useRef<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finishOpen, setFinishOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const sessionRef = useRef(session);
  const exerciseIndexRef = useRef(0);
  const indexInitialized = useRef(false);

  sessionRef.current = session;
  exerciseIndexRef.current = exerciseIndex;

  const wakeLockOn = settings.wakeLockEnabled !== false;
  useWakeLock(wakeLockOn && session?.status === "active");

  useEffect(() => {
    if (sessionId) setActiveSessionId(sessionId);
  }, [sessionId]);

  // Resume timer when entering live view (after pause away from page).
  useEffect(() => {
    const s = sessionRef.current;
    if (!s || s.status !== "active") return;
    if (isSessionPaused(s)) {
      upsertSession(resumeSession(s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    indexInitialized.current = false;
  }, [sessionId]);

  useEffect(() => {
    const s = sessionRef.current;
    if (!s || s.status !== "active" || indexInitialized.current) return;
    indexInitialized.current = true;
    setExerciseIndex(initialExerciseIndex(s));
  }, [session]);

  // Persist exercise index without pausing the workout clock.
  useEffect(() => {
    const s = sessionRef.current;
    if (!s || s.status !== "active") return;
    if (s.activeExerciseIndex === exerciseIndex) return;
    upsertSession({ ...s, activeExerciseIndex: exerciseIndex });
  }, [exerciseIndex, upsertSession]);

  // Pause only when leaving the live page (true unmount), not when deps churn.
  useEffect(() => {
    return () => {
      const s = sessionRef.current;
      if (!s || s.status !== "active") return;
      if (!isSessionPaused(s)) {
        upsertSession(snapshotLiveSession(s, exerciseIndexRef.current));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Background: pause clock when app hides; resume when visible again.
  useEffect(() => {
    function flushPause() {
      const s = sessionRef.current;
      if (!s || s.status !== "active" || isSessionPaused(s)) return;
      upsertSession(snapshotLiveSession(s, exerciseIndexRef.current));
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushPause();
        return;
      }
      const s = sessionRef.current;
      if (!s || s.status !== "active") return;
      if (isSessionPaused(s)) {
        upsertSession(resumeSession(s));
      }
      void unlockAudio();
    }
    window.addEventListener("pagehide", flushPause);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushPause);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [sessionId, upsertSession]);

  // Elapsed clock — always read latest session from ref so pause/resume stick.
  useEffect(() => {
    if (!sessionId) return;
    const tick = () => {
      const s = sessionRef.current;
      if (!s || s.status !== "active") return;
      setElapsed(getSessionElapsedSeconds(s));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  // Unlock audio/vibration after first interaction (iOS requirement).
  useEffect(() => {
    function unlock() {
      void unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [sessionId]);

  const rest = useRestTimer({
    soundEnabled: settings.soundEnabled,
    vibrationEnabled: settings.vibrationEnabled,
  });

  useEffect(() => {
    loadExerciseIndex().then((idx) => {
      setCatalog(idx.exercises);
      const s = sessionRef.current;
      if (!s) return;
      const needs = s.exercises.some((e) => !e.primaryMuscles?.length);
      if (!needs) return;
      const enriched: Session = {
        ...s,
        exercises: s.exercises.map((ex) => {
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

  // Timed exercise countdown (absolute end time — survives background throttling).
  useEffect(() => {
    if (!session || session.type !== "timed" || !current || !timedRunning) return;
    if (!timedEndAtRef.current) return;
    let finished = false;
    const tick = () => {
      if (!timedEndAtRef.current || finished) return;
      const left = Math.max(
        0,
        Math.ceil((timedEndAtRef.current - Date.now()) / 1000),
      );
      setTimedLeft(left);
      if (left <= 0) {
        finished = true;
        timedEndAtRef.current = null;
        setTimedRunning(false);
        completeTimedExercise();
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    function onVisible() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedRunning, session?.id, exerciseIndex]);

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

  function toggleSet(setIndex: number, data: Partial<LoggedSet>) {
    if (!session || !current) return;
    const target = current.sets[setIndex];
    if (!target) return;

    if (target.completed) {
      const sets = current.sets.map((s, i) =>
        i === setIndex
          ? { ...s, completed: false, completedAt: undefined }
          : s,
      );
      const exercises = session.exercises.map((ex, i) =>
        i === exerciseIndex ? { ...ex, sets } : ex,
      );
      updateSession({ ...session, exercises });
      return;
    }

    void unlockAudio();
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
    playTimedEndSound(settings.soundEnabled);
    vibrateTimedEnd(settings.vibrationEnabled);
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
      timedEndAtRef.current = null;
      setTimedLeft(null);
      setTimedRunning(false);
    }
  }

  function startTimedBlock() {
    if (!current?.durationSeconds) return;
    void unlockAudio();
    const seconds = current.durationSeconds;
    timedEndAtRef.current = Date.now() + seconds * 1000;
    setTimedLeft(seconds);
    setTimedRunning(true);
  }

  function finishSession() {
    if (!session) return;
    const completed = completeSession(session, sessions);
    updateSession(completed);
    setActiveSessionId(null);
    setFinishOpen(false);
    router.push(`/history/${completed.id}?done=1`);
  }

  function confirmExit() {
    if (!session) return;
    updateSession(snapshotLiveSession(session, exerciseIndex));
    setExitOpen(false);
    router.push("/");
  }

  function openCatalog(mode: "add" | "replace", index = exerciseIndex) {
    if (!session) return;
    updateSession(snapshotLiveSession(session, index));
    setMenuOpenId(null);
    router.push(
      `/session/pick?id=${encodeURIComponent(session.id)}&mode=${mode}&index=${index}`,
    );
  }

  function removeExerciseAt(index: number) {
    if (!session) return;
    const exercises = session.exercises.filter((_, i) => i !== index);
    updateSession({ ...session, exercises });
    setExerciseIndex((i) => Math.max(0, Math.min(i, exercises.length - 1)));
    setMenuOpenId(null);
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
          aria-label="Esci dall'allenamento"
          onClick={() => setExitOpen(true)}
        >
          ⌄
        </button>
        <div className="flex flex-1 justify-center text-muted" aria-hidden>
          ⏱
        </div>
        <Button type="button" variant="accent" onClick={() => setFinishOpen(true)}>
          Fine
        </Button>
      </header>

      <FinishWorkoutModal
        open={finishOpen}
        sessionName={session.routineName}
        onClose={() => setFinishOpen(false)}
        onConfirm={finishSession}
      />

      <ExitWorkoutModal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        onConfirm={confirmExit}
      />

      <div className="mb-4 grid grid-cols-3 gap-2 border border-hairline px-3 py-3">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted">
            Durata
          </div>
          <Mono className="text-lg text-accent">{formatSessionElapsed(elapsed)}</Mono>
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
          <div className="text-[10px] uppercase tracking-wide text-muted">
            {session.type === "timed" ? "Esercizi" : "Set"}
          </div>
          <Mono className="text-lg">
            {session.type === "timed"
              ? `${session.exercises.filter((e) => e.sets.some((s) => s.completed)).length}/${session.exercises.length}`
              : liveStats.setsDone}
          </Mono>
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
          <Button type="button" onClick={() => openCatalog("add")}>
            Aggiungi esercizio
          </Button>
        </div>
      ) : session.type === "timed" ? (
        <TimedCircuitLayout
          session={session}
          sessionId={sessionId}
          catalog={catalog}
          exerciseIndex={exerciseIndex}
          current={current}
          timedLeft={timedLeft}
          timedRunning={timedRunning}
          menuOpenId={menuOpenId}
          restRunning={rest.running}
          restRemaining={rest.remaining}
          onSelectExercise={(i) => {
            timedEndAtRef.current = null;
            setExerciseIndex(i);
            setTimedLeft(null);
            setTimedRunning(false);
            setMenuOpenId(null);
          }}
          onToggleMenu={(id) =>
            setMenuOpenId((cur) => (cur === id ? null : id))
          }
          onReplace={(i) => openCatalog("replace", i)}
          onRemove={removeExerciseAt}
          onNotes={(notes) => patchCurrent({ notes })}
          onStartTimed={startTimedBlock}
          onCompleteTimed={completeTimedExercise}
          onAdd={() => openCatalog("add")}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-1 pt-2">
          <ul className="divide-y divide-hairline">
            {session.exercises.map((ex, i) => {
              const open = i === exerciseIndex;
              const done = ex.sets.filter((s) => s.completed).length;
              const total = ex.sets.length;
              const cat = catalog.find((c) => c.id === ex.exerciseId);
              const isCurrent = open && current;
              const menuOpen = menuOpenId === ex.id;

              return (
                <li key={ex.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <ExerciseThumb
                      size="sm"
                      eager={open}
                      exerciseId={ex.exerciseId}
                      exerciseName={ex.exerciseName}
                      imagePath={cat?.images[0]}
                      primaryMuscles={ex.primaryMuscles}
                      secondaryMuscles={cat?.secondaryMuscles}
                      returnHref={`/session/live?id=${sessionId}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left touch-manipulation"
                          onClick={() => {
                            setExerciseIndex(i);
                            setTimedLeft(null);
                            setTimedRunning(false);
                            setMenuOpenId(null);
                          }}
                        >
                          <h2
                            className={`truncate font-display font-bold leading-tight tracking-tight ${
                              open ? "text-xl" : "text-base font-medium"
                            }`}
                          >
                            {ex.exerciseName}
                          </h2>
                          {!open && (
                            <div className="mt-0.5 text-sm text-muted">
                              {done}/{total} Fatto
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center text-muted touch-manipulation"
                          aria-label="Menu esercizio"
                          onClick={() =>
                            setMenuOpenId((id) => (id === ex.id ? null : ex.id))
                          }
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
                              setExerciseIndex(i);
                              setTimedLeft(null);
                              setTimedRunning(false);
                              setMenuOpenId(null);
                            }}
                          >
                            Modifica
                          </button>
                          <button
                            type="button"
                            className="min-h-10 border border-hairline px-2 text-muted touch-manipulation"
                            onClick={() => openCatalog("replace", i)}
                          >
                            Sostituisci
                          </button>
                          <button
                            type="button"
                            className="min-h-10 border border-hairline px-2 text-muted touch-manipulation"
                            onClick={() => removeExerciseAt(i)}
                          >
                            Rimuovi
                          </button>
                        </div>
                      )}

                      {open && isCurrent && (
                        <>
                          <input
                            className="mt-2 w-full border-0 border-b border-hairline bg-transparent py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
                            placeholder="Note…"
                            value={current.notes ?? ""}
                            onChange={(e) =>
                              patchCurrent({ notes: e.target.value })
                            }
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
                        </>
                      )}
                    </div>
                  </div>

                  {open && isCurrent && (
                    <div className="mt-4">
                      <SetsBlock
                        exercise={current}
                        unit={settings.unit}
                        previousSets={previousSets}
                        onToggleSet={toggleSet}
                        onAddSet={addSet}
                        onUpdateSet={(setIndex, patch) => {
                          const sets = current.sets.map((s, idx) =>
                            idx === setIndex ? { ...s, ...patch } : s,
                          );
                          patchCurrent({ sets });
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <Button
            type="button"
            variant="ghost"
            className="mt-4 w-full"
            onClick={() => openCatalog("add")}
          >
            + Aggiungi esercizio
          </Button>
        </div>
      )}
    </div>
  );
}

function TimedCircuitLayout({
  session,
  sessionId,
  catalog,
  exerciseIndex,
  current,
  timedLeft,
  timedRunning,
  menuOpenId,
  restRunning,
  restRemaining,
  onSelectExercise,
  onToggleMenu,
  onReplace,
  onRemove,
  onNotes,
  onStartTimed,
  onCompleteTimed,
  onAdd,
}: {
  session: Session;
  sessionId: string;
  catalog: ExerciseIndexEntry[];
  exerciseIndex: number;
  current?: SessionExercise;
  timedLeft: number | null;
  timedRunning: boolean;
  menuOpenId: string | null;
  restRunning: boolean;
  restRemaining: number;
  onSelectExercise: (index: number) => void;
  onToggleMenu: (id: string) => void;
  onReplace: (index: number) => void;
  onRemove: (index: number) => void;
  onNotes: (notes: string) => void;
  onStartTimed: () => void;
  onCompleteTimed: () => void;
  onAdd: () => void;
}) {
  const upcoming = session.exercises
    .map((ex, i) => ({ ex, i }))
    .filter(({ i }) => i > exerciseIndex);
  const done = session.exercises
    .map((ex, i) => ({ ex, i }))
    .filter(({ i }) => i < exerciseIndex);
  const cat = current
    ? catalog.find((c) => c.id === current.exerciseId)
    : undefined;
  const menuOpen = current ? menuOpenId === current.id : false;

  return (
    <div className="flex flex-1 flex-col gap-5 pb-4">
      <div className="sticky top-0 z-20 -mx-4 border-b border-hairline bg-chalk/95 px-4 pb-4 pt-1 backdrop-blur-sm">
        <TimedBlock
          duration={current?.durationSeconds ?? 40}
          left={timedLeft}
          running={timedRunning}
          onStart={onStartTimed}
          onComplete={onCompleteTimed}
        />
      </div>

      {current && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted">
            In corso · {exerciseIndex + 1}/{session.exercises.length}
          </p>
          <div className="flex items-start gap-3">
            <ExerciseThumb
              size="sm"
              eager
              exerciseId={current.exerciseId}
              exerciseName={current.exerciseName}
              imagePath={cat?.images[0]}
              primaryMuscles={current.primaryMuscles}
              secondaryMuscles={cat?.secondaryMuscles}
              returnHref={`/session/live?id=${sessionId}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold leading-tight tracking-tight">
                    {current.exerciseName}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {current.durationSeconds ?? 40}s
                    {current.restSeconds > 0
                      ? ` · recupero ${current.restSeconds}s`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-muted touch-manipulation"
                  aria-label="Menu esercizio"
                  onClick={() => onToggleMenu(current.id)}
                >
                  ⋯
                </button>
              </div>

              {menuOpen && (
                <div className="mt-1 flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    className="min-h-10 border border-hairline px-2 text-muted touch-manipulation"
                    onClick={() => onReplace(exerciseIndex)}
                  >
                    Sostituisci
                  </button>
                  <button
                    type="button"
                    className="min-h-10 border border-hairline px-2 text-muted touch-manipulation"
                    onClick={() => onRemove(exerciseIndex)}
                  >
                    Rimuovi
                  </button>
                </div>
              )}

              <input
                className="mt-2 w-full border-0 border-b border-hairline bg-transparent py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
                placeholder="Note…"
                value={current.notes ?? ""}
                onChange={(e) => onNotes(e.target.value)}
              />
              <p className="mt-2 text-sm text-muted">
                Recupero:{" "}
                <span className={restRunning ? "text-accent" : ""}>
                  {restRunning
                    ? formatDuration(restRemaining)
                    : current.restSeconds > 0
                      ? `${current.restSeconds}s`
                      : "Spento"}
                </span>
              </p>
            </div>
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted">
            Prossimi
          </h3>
          <ul className="divide-y divide-hairline">
            {upcoming.map(({ ex, i }) => {
              const rowCat = catalog.find((c) => c.id === ex.exerciseId);
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 py-3 text-left touch-manipulation hover:text-accent"
                    onClick={() => onSelectExercise(i)}
                  >
                    <ExerciseThumb
                      size="sm"
                      link={false}
                      exerciseId={ex.exerciseId}
                      exerciseName={ex.exerciseName}
                      imagePath={rowCat?.images[0]}
                      primaryMuscles={ex.primaryMuscles}
                      secondaryMuscles={rowCat?.secondaryMuscles}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{ex.exerciseName}</div>
                      <div className="text-xs text-muted">
                        {ex.durationSeconds ?? 40}s
                      </div>
                    </div>
                    <span className="text-xs text-muted">{i + 1}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted">Fatti</h3>
          <ul className="divide-y divide-hairline opacity-60">
            {done.map(({ ex, i }) => {
              const rowCat = catalog.find((c) => c.id === ex.exerciseId);
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 py-3 text-left touch-manipulation hover:opacity-100"
                    onClick={() => onSelectExercise(i)}
                  >
                    <ExerciseThumb
                      size="sm"
                      link={false}
                      exerciseId={ex.exerciseId}
                      exerciseName={ex.exerciseName}
                      imagePath={rowCat?.images[0]}
                      primaryMuscles={ex.primaryMuscles}
                      secondaryMuscles={rowCat?.secondaryMuscles}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium line-through">
                        {ex.exerciseName}
                      </div>
                      <div className="text-xs text-muted">Completato</div>
                    </div>
                    <span className="text-xs text-accent" aria-hidden>
                      ✓
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Button type="button" variant="ghost" className="w-full" onClick={onAdd}>
        + Aggiungi esercizio
      </Button>
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
    <div className="space-y-3 text-center">
      <div className="font-mono text-6xl tabular-nums leading-none tracking-tighter sm:text-7xl">
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
  onToggleSet,
  onAddSet,
  onUpdateSet,
}: {
  exercise: SessionExercise;
  unit: "kg" | "lb";
  previousSets: LoggedSet[];
  onToggleSet: (setIndex: number, data: Partial<LoggedSet>) => void;
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
                aria-label={
                  set.completed ? "Annulla serie" : "Completa serie"
                }
                className={`flex h-10 w-10 items-center justify-center touch-manipulation ${
                  set.completed
                    ? "bg-accent text-chalk"
                    : "border border-hairline text-muted"
                }`}
                onClick={() =>
                  onToggleSet(index, {
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

export { getActiveSessionId } from "@/lib/session-active";
