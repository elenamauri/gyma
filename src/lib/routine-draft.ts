"use client";

import type {
  ExerciseIndexEntry,
  Routine,
  RoutineExerciseReps,
  RoutineExerciseTimed,
  RoutineType,
} from "@/lib/types";
import { uid } from "@/lib/storage";

const DRAFT_KEY = "gyma:routineDraft";

export interface RoutineDraft {
  id?: string;
  name: string;
  type: RoutineType;
  repsExercises: RoutineExerciseReps[];
  timedExercises: RoutineExerciseTimed[];
  createdAt?: string;
  returnPath: string;
}

export function emptyDraft(returnPath: string, initial?: Routine): RoutineDraft {
  if (initial) {
    return {
      id: initial.id,
      name: initial.name,
      type: initial.type,
      repsExercises:
        initial.type === "reps"
          ? (initial.exercises as RoutineExerciseReps[])
          : [],
      timedExercises:
        initial.type === "timed"
          ? (initial.exercises as RoutineExerciseTimed[])
          : [],
      createdAt: initial.createdAt,
      returnPath,
    };
  }
  return {
    name: "",
    type: "reps",
    repsExercises: [],
    timedExercises: [],
    returnPath,
  };
}

export function loadDraft(): RoutineDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RoutineDraft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: RoutineDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

export function ensureDraft(
  returnPath: string,
  initial?: Routine,
): RoutineDraft {
  const existing = loadDraft();
  if (existing && existing.returnPath === returnPath) {
    if (!initial || existing.id === initial.id) return existing;
  }
  const draft = emptyDraft(returnPath, initial);
  saveDraft(draft);
  return draft;
}

export function addExerciseToDraft(
  draft: RoutineDraft,
  ex: ExerciseIndexEntry,
  defaultRestSeconds: number,
): RoutineDraft {
  if (draft.type === "reps") {
    const next: RoutineDraft = {
      ...draft,
      repsExercises: [
        ...draft.repsExercises,
        {
          id: uid(),
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets: 3,
          reps: 10,
          restSeconds: defaultRestSeconds,
        },
      ],
    };
    saveDraft(next);
    return next;
  }
  const next: RoutineDraft = {
    ...draft,
    timedExercises: [
      ...draft.timedExercises,
      {
        id: uid(),
        exerciseId: ex.id,
        exerciseName: ex.name,
        durationSeconds: 40,
        restSeconds: 20,
      },
    ],
  };
  saveDraft(next);
  return next;
}

export function removeExerciseFromDraft(
  draft: RoutineDraft,
  exerciseId: string,
): RoutineDraft {
  const next: RoutineDraft = {
    ...draft,
    repsExercises: draft.repsExercises.filter((e) => e.exerciseId !== exerciseId),
    timedExercises: draft.timedExercises.filter(
      (e) => e.exerciseId !== exerciseId,
    ),
  };
  saveDraft(next);
  return next;
}

export function draftHasExercise(draft: RoutineDraft, exerciseId: string) {
  const list =
    draft.type === "reps" ? draft.repsExercises : draft.timedExercises;
  return list.some((e) => e.exerciseId === exerciseId);
}

export function draftExerciseCount(draft: RoutineDraft) {
  return draft.type === "reps"
    ? draft.repsExercises.length
    : draft.timedExercises.length;
}

export function draftToRoutine(draft: RoutineDraft): Routine {
  const now = new Date().toISOString();
  return {
    id: draft.id ?? uid(),
    name: draft.name.trim(),
    type: draft.type,
    exercises:
      draft.type === "reps" ? draft.repsExercises : draft.timedExercises,
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
  };
}
