import type { LoggedSet, PersonalRecord, Session, SessionExercise } from "./types";

export function setVolume(set: LoggedSet): number {
  if (!set.completed) return 0;
  return (set.weight ?? 0) * set.reps;
}

export function exerciseVolume(exercise: SessionExercise): number {
  return exercise.sets.reduce((sum, s) => sum + setVolume(s), 0);
}

export function exerciseMaxWeight(exercise: SessionExercise): number {
  return exercise.sets.reduce((max, s) => {
    if (!s.completed || s.weight === undefined) return max;
    return Math.max(max, s.weight);
  }, 0);
}

export function historicalMaxWeight(
  sessions: Session[],
  exerciseId: string,
  excludeSessionId?: string,
): number {
  let max = 0;
  for (const session of sessions) {
    if (session.status !== "completed") continue;
    if (excludeSessionId && session.id === excludeSessionId) continue;
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      max = Math.max(max, exerciseMaxWeight(ex));
    }
  }
  return max;
}

export function historicalMaxVolume(
  sessions: Session[],
  exerciseId: string,
  excludeSessionId?: string,
): number {
  let max = 0;
  for (const session of sessions) {
    if (session.status !== "completed") continue;
    if (excludeSessionId && session.id === excludeSessionId) continue;
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      max = Math.max(max, exerciseVolume(ex));
    }
  }
  return max;
}

export function detectPRs(
  session: Session,
  previousSessions: Session[],
): PersonalRecord[] {
  const prs: PersonalRecord[] = [];
  const achievedAt = session.completedAt ?? new Date().toISOString();

  for (const ex of session.exercises) {
    const maxW = exerciseMaxWeight(ex);
    const vol = exerciseVolume(ex);
    const prevW = historicalMaxWeight(previousSessions, ex.exerciseId);
    const prevV = historicalMaxVolume(previousSessions, ex.exerciseId);

    if (maxW > 0 && maxW > prevW) {
      prs.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        kind: "weight",
        value: maxW,
        previousValue: prevW > 0 ? prevW : undefined,
        sessionId: session.id,
        achievedAt,
      });
    }

    if (vol > 0 && vol > prevV) {
      prs.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        kind: "volume",
        value: vol,
        previousValue: prevV > 0 ? prevV : undefined,
        sessionId: session.id,
        achievedAt,
      });
    }
  }

  return prs;
}

export interface ProgressPoint {
  date: string;
  maxWeight: number;
  volume: number;
}

export function exerciseProgressSeries(
  sessions: Session[],
  exerciseId: string,
): ProgressPoint[] {
  const points: ProgressPoint[] = [];
  const completed = sessions
    .filter((s) => s.status === "completed" && s.completedAt)
    .sort(
      (a, b) =>
        new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime(),
    );

  for (const session of completed) {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const maxWeight = exerciseMaxWeight(ex);
    const volume = exerciseVolume(ex);
    if (maxWeight === 0 && volume === 0) continue;
    points.push({
      date: session.completedAt!,
      maxWeight,
      volume,
    });
  }

  return points;
}
