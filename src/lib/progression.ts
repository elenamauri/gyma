import type {
  LoggedSet,
  Routine,
  RoutineExerciseReps,
  RoutineProgression,
  Session,
  SessionExercise,
} from "./types";
import { DEFAULT_PROGRESSION } from "./types";
import { toDateKey } from "./utils";

export function normalizeProgression(
  p?: RoutineProgression | null,
): RoutineProgression {
  return { ...DEFAULT_PROGRESSION, ...p };
}

/** Monday 00:00 local of the week containing `date`. */
export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

export function weeklyCompletedCount(
  sessions: Session[],
  now = new Date(),
): number {
  const start = startOfWeek(now).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => {
    if (s.status !== "completed") return false;
    const t = new Date(s.completedAt ?? s.startedAt).getTime();
    return t >= start && t < end;
  }).length;
}

export function weeklyGoalProgress(
  sessions: Session[],
  goal: number,
  now = new Date(),
): { done: number; goal: number; pct: number } {
  const g = Math.max(0, goal);
  const done = weeklyCompletedCount(sessions, now);
  return {
    done,
    goal: g,
    pct: g > 0 ? Math.min(100, Math.round((done / g) * 100)) : 0,
  };
}

/**
 * Next routine in the same program after the last completed workout.
 * Cycles to the first routine when at the end.
 */
export function suggestNextRoutine(
  routines: Routine[],
  sessions: Session[],
): Routine | null {
  if (routines.length === 0) return null;

  const completed = [...sessions]
    .filter((s) => s.status === "completed" && s.routineId)
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.startedAt).getTime() -
        new Date(a.completedAt ?? a.startedAt).getTime(),
    );

  const lastId = completed[0]?.routineId;
  if (!lastId) {
    return [...routines].sort((a, b) => a.name.localeCompare(b.name, "it"))[0];
  }

  const last = routines.find((r) => r.id === lastId);
  if (!last) {
    return [...routines].sort((a, b) => a.name.localeCompare(b.name, "it"))[0];
  }

  const inProgram = routines
    .filter((r) => r.programId === last.programId)
    .sort((a, b) => a.name.localeCompare(b.name, "it"));

  if (inProgram.length === 0) return last;

  const idx = inProgram.findIndex((r) => r.id === last.id);
  if (idx < 0) return inProgram[0];
  return inProgram[(idx + 1) % inProgram.length];
}

function avgCompletedRpe(sets: LoggedSet[]): number | null {
  const vals = sets
    .filter((s) => s.completed && s.rpe !== undefined)
    .map((s) => s.rpe!);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function sessionHitsTargets(session: Session): boolean {
  for (const ex of session.exercises) {
    const targetSets = ex.targetSets ?? ex.sets.length;
    const done = ex.sets.filter((s) => s.completed);
    if (done.length < targetSets) return false;
    if (ex.targetReps !== undefined) {
      if (done.some((s) => s.reps < ex.targetReps!)) return false;
    }
  }
  return session.exercises.length > 0;
}

function roundWeight(w: number): number {
  return Math.round(w * 4) / 4;
}

function bumpRepsExercises(
  exercises: RoutineExerciseReps[],
  session: Session,
  bumpKg: number,
): RoutineExerciseReps[] {
  return exercises.map((ex) => {
    const logged = session.exercises.find((e) => e.exerciseId === ex.exerciseId);
    if (!logged) return ex;
    const base = ex.targetWeight ?? logged.sets.find((s) => s.completed)?.weight;
    if (base === undefined) return ex;
    return { ...ex, targetWeight: roundWeight(base + bumpKg) };
  });
}

function deloadRepsExercises(
  exercises: RoutineExerciseReps[],
  percent: number,
): RoutineExerciseReps[] {
  const factor = 1 - Math.max(0, Math.min(50, percent)) / 100;
  return exercises.map((ex) => {
    if (ex.targetWeight === undefined) return ex;
    return {
      ...ex,
      targetWeight: roundWeight(ex.targetWeight * factor),
    };
  });
}

/**
 * After a completed session, optionally update routine target weights.
 * Returns null if nothing to change.
 */
export function applyProgressionAfterSession(
  routine: Routine,
  session: Session,
): { routine: Routine; note: string } | null {
  if (routine.type !== "reps") return null;
  const progression = normalizeProgression(routine.progression);
  if (!progression.enabled) return null;

  const exercises = routine.exercises as RoutineExerciseReps[];
  let nextExercises = exercises;
  let sessionsSince = progression.sessionsSinceDeload + 1;
  let note = "";

  const shouldDeload =
    progression.deloadEveryNSessions > 0 &&
    sessionsSince >= progression.deloadEveryNSessions;

  if (shouldDeload) {
    nextExercises = deloadRepsExercises(
      exercises,
      progression.deloadPercent,
    );
    sessionsSince = 0;
    note = `Deload −${progression.deloadPercent}% sui carichi target.`;
  } else {
    let bump = false;
    if (progression.bumpWhen === "all_sets_hit") {
      bump = sessionHitsTargets(session);
    } else {
      const rpes: number[] = [];
      for (const ex of session.exercises) {
        const avg = avgCompletedRpe(ex.sets);
        if (avg !== null) rpes.push(avg);
      }
      const avg =
        rpes.length > 0
          ? rpes.reduce((a, b) => a + b, 0) / rpes.length
          : null;
      bump =
        sessionHitsTargets(session) &&
        avg !== null &&
        avg < progression.rpeCeiling;
    }
    if (bump && progression.bumpKg > 0) {
      nextExercises = bumpRepsExercises(
        exercises,
        session,
        progression.bumpKg,
      );
      note = `+${progression.bumpKg} kg sui carichi target.`;
    }
  }

  const nextProgression: RoutineProgression = {
    ...progression,
    sessionsSinceDeload: sessionsSince,
  };

  const weightsChanged =
    JSON.stringify(nextExercises.map((e) => e.targetWeight)) !==
    JSON.stringify(exercises.map((e) => e.targetWeight));

  if (!weightsChanged && sessionsSince === progression.sessionsSinceDeload + 1) {
    // Still persist counter
    return {
      routine: {
        ...routine,
        progression: nextProgression,
        updatedAt: new Date().toISOString(),
      },
      note: note || "Progressione aggiornata.",
    };
  }

  return {
    routine: {
      ...routine,
      exercises: nextExercises,
      progression: nextProgression,
      updatedAt: new Date().toISOString(),
    },
    note: note || "Progressione aggiornata.",
  };
}

export function groupLabel(kind?: string): string {
  if (kind === "dropset") return "Drop set";
  if (kind === "superset") return "Superset";
  return "Gruppo";
}

/** Rest between exercises in the same group (seconds). */
export const INTRA_GROUP_REST_SECONDS = 15;

export function restSecondsForTransition(
  current: SessionExercise | undefined,
  next: SessionExercise | undefined,
): number {
  if (!current) return 0;
  if (
    current.groupId &&
    next?.groupId &&
    current.groupId === next.groupId
  ) {
    return Math.min(current.restSeconds, INTRA_GROUP_REST_SECONDS);
  }
  return current.restSeconds;
}

/** Weekday keys that had workouts this week (for dashboard hints). */
export function workoutDaysThisWeek(sessions: Session[], now = new Date()): string[] {
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const keys = new Set<string>();
  for (const s of sessions) {
    if (s.status !== "completed") continue;
    const t = new Date(s.completedAt ?? s.startedAt);
    if (t >= start && t < end) keys.add(toDateKey(t));
  }
  return [...keys];
}
