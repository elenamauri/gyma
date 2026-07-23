import type {
  ExerciseGroupKind,
  RoutineExerciseReps,
  RoutineExerciseTimed,
  SessionExercise,
} from "./types";
import { uid } from "./storage";

type Groupable = {
  id: string;
  groupId?: string;
  groupKind?: ExerciseGroupKind;
};

/** Link this exercise with the next one as a superset. */
export function linkSupersetWithNext<T extends Groupable>(
  list: T[],
  id: string,
): T[] {
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0 || idx >= list.length - 1) return list;
  const a = list[idx];
  const b = list[idx + 1];
  const groupId = a.groupId && a.groupKind === "superset" ? a.groupId : uid();
  return list.map((e, i) => {
    if (i === idx || i === idx + 1) {
      return { ...e, groupId, groupKind: "superset" as const };
    }
    if (
      b.groupId &&
      e.groupId === b.groupId &&
      e.id !== b.id &&
      e.groupKind === "superset"
    ) {
      return { ...e, groupId, groupKind: "superset" as const };
    }
    return e;
  });
}

/** Unlink exercise from its group (and dissolve group if <2 left). */
export function unlinkFromGroup<T extends Groupable>(list: T[], id: string): T[] {
  const target = list.find((e) => e.id === id);
  if (!target?.groupId) return list;
  const gid = target.groupId;
  const cleared = list.map((e) =>
    e.id === id ? { ...e, groupId: undefined, groupKind: undefined } : e,
  );
  const remaining = cleared.filter((e) => e.groupId === gid);
  if (remaining.length < 2) {
    return cleared.map((e) =>
      e.groupId === gid
        ? { ...e, groupId: undefined, groupKind: undefined }
        : e,
    );
  }
  return cleared;
}

/** Add a drop-set step after this exercise (same move, lighter target). */
export function addDropSetStep(
  list: RoutineExerciseReps[],
  id: string,
): RoutineExerciseReps[] {
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return list;
  const base = list[idx];
  const groupId =
    base.groupId && base.groupKind === "dropset" ? base.groupId : uid();
  const prevWeight = base.targetWeight;
  const dropWeight =
    prevWeight !== undefined
      ? Math.round(prevWeight * 0.8 * 4) / 4
      : undefined;

  const step: RoutineExerciseReps = {
    ...base,
    id: uid(),
    sets: Math.max(1, Math.min(2, base.sets)),
    targetWeight: dropWeight,
    restSeconds: 0,
    groupId,
    groupKind: "dropset",
    notes: base.notes,
  };

  const withGroup = list.map((e, i) =>
    i === idx ? { ...e, groupId, groupKind: "dropset" as const } : e,
  );
  return [
    ...withGroup.slice(0, idx + 1),
    step,
    ...withGroup.slice(idx + 1),
  ];
}

export function addDropSetStepTimed(
  list: RoutineExerciseTimed[],
  id: string,
): RoutineExerciseTimed[] {
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return list;
  const base = list[idx];
  const groupId =
    base.groupId && base.groupKind === "dropset" ? base.groupId : uid();
  const step: RoutineExerciseTimed = {
    ...base,
    id: uid(),
    durationSeconds: Math.max(15, Math.round(base.durationSeconds * 0.75)),
    restSeconds: 0,
    groupId,
    groupKind: "dropset",
  };
  const withGroup = list.map((e, i) =>
    i === idx ? { ...e, groupId, groupKind: "dropset" as const } : e,
  );
  return [
    ...withGroup.slice(0, idx + 1),
    step,
    ...withGroup.slice(idx + 1),
  ];
}

/** Drop-set step for a live session exercise list. */
export function addDropSetStepSession(
  list: SessionExercise[],
  id: string,
): SessionExercise[] {
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return list;
  const base = list[idx];
  const groupId =
    base.groupId && base.groupKind === "dropset" ? base.groupId : uid();

  const refSet =
    [...base.sets].reverse().find((s) => s.weight !== undefined) ??
    base.sets[base.sets.length - 1];
  const prevWeight = refSet?.weight ?? base.targetWeight;
  const dropWeight =
    prevWeight !== undefined
      ? Math.round(prevWeight * 0.8 * 4) / 4
      : undefined;

  const setCount = Math.max(
    1,
    Math.min(2, (base.targetSets ?? base.sets.length) || 1),
  );
  const reps = base.targetReps ?? refSet?.reps ?? 10;
  const isTimed = Boolean(base.durationSeconds);

  const step: SessionExercise = {
    ...base,
    id: uid(),
    targetSets: setCount,
    targetWeight: dropWeight,
    durationSeconds: isTimed
      ? Math.max(15, Math.round((base.durationSeconds ?? 40) * 0.75))
      : undefined,
    restSeconds: 0,
    groupId,
    groupKind: "dropset",
    replacedFromId: undefined,
    sets: Array.from({ length: isTimed ? 1 : setCount }, () => ({
      id: uid(),
      reps: isTimed ? 1 : reps,
      weight: dropWeight,
      completed: false,
    })),
  };

  const withGroup = list.map((e, i) =>
    i === idx ? { ...e, groupId, groupKind: "dropset" as const } : e,
  );
  return [
    ...withGroup.slice(0, idx + 1),
    step,
    ...withGroup.slice(idx + 1),
  ];
}
