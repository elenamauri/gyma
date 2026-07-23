import type { LoggedSet, Session, SessionExercise } from "./types";
import { exerciseVolume } from "./pr";
import { displayWeight } from "./units";

export interface ExerciseCompareRow {
  exerciseId: string;
  exerciseName: string;
  a: SideStats | null;
  b: SideStats | null;
}

export interface SideStats {
  setsDone: number;
  reps: number;
  volume: number;
  maxWeight?: number;
  avgRpe: number | null;
  sets: LoggedSet[];
}

function sideFromExercise(ex: SessionExercise): SideStats {
  const done = ex.sets.filter((s) => s.completed);
  const rpes = done
    .filter((s) => s.rpe !== undefined)
    .map((s) => s.rpe!);
  const weights = done
    .map((s) => s.weight)
    .filter((w): w is number => w !== undefined);
  return {
    setsDone: done.length,
    reps: done.reduce((n, s) => n + s.reps, 0),
    volume: exerciseVolume(ex),
    maxWeight: weights.length ? Math.max(...weights) : undefined,
    avgRpe:
      rpes.length > 0
        ? rpes.reduce((a, b) => a + b, 0) / rpes.length
        : null,
    sets: done,
  };
}

export function compareSessions(
  a: Session,
  b: Session,
): {
  rows: ExerciseCompareRow[];
  totals: {
    a: { volume: number; sets: number; duration?: number };
    b: { volume: number; sets: number; duration?: number };
  };
} {
  const map = new Map<string, ExerciseCompareRow>();

  for (const ex of a.exercises) {
    map.set(ex.exerciseId, {
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      a: sideFromExercise(ex),
      b: null,
    });
  }
  for (const ex of b.exercises) {
    const existing = map.get(ex.exerciseId);
    if (existing) {
      existing.b = sideFromExercise(ex);
    } else {
      map.set(ex.exerciseId, {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        a: null,
        b: sideFromExercise(ex),
      });
    }
  }

  const rows = [...map.values()];
  const sum = (session: Session) => ({
    volume: session.exercises.reduce((n, ex) => n + exerciseVolume(ex), 0),
    sets: session.exercises.reduce(
      (n, ex) => n + ex.sets.filter((s) => s.completed).length,
      0,
    ),
    duration: session.durationSeconds,
  });

  return {
    rows,
    totals: { a: sum(a), b: sum(b) },
  };
}

export function formatSideWeight(
  kg: number | undefined,
  unit: "kg" | "lb",
): string {
  if (kg === undefined) return "—";
  const w = displayWeight(kg, unit);
  return w !== undefined ? `${w}` : "—";
}
