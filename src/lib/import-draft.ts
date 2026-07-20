import type { RoutineType } from "./types";
import type { ResolvedImportExercise } from "./ai-import";

const DRAFT_KEY = "gyma:importDraft";

export interface ImportRoutineDraft {
  name: string;
  type: RoutineType;
  exercises: ResolvedImportExercise[];
}

export interface ImportDraft {
  returnPath: string;
  mode: "routine" | "program";
  /** Target program when importing a single routine. */
  programId?: string;
  routine?: ImportRoutineDraft;
  program?: {
    name: string;
    routines: ImportRoutineDraft[];
  };
}

export function loadImportDraft(): ImportDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImportDraft;
  } catch {
    return null;
  }
}

export function saveImportDraft(draft: ImportDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearImportDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

export function updateImportExercisePick(
  draft: ImportDraft,
  routineIndex: number,
  exerciseIndex: number,
  pick: { id: string; name: string },
): ImportDraft {
  if (draft.mode === "routine" && draft.routine) {
    return {
      ...draft,
      routine: {
        ...draft.routine,
        exercises: draft.routine.exercises.map((ex, i) =>
          i === exerciseIndex
            ? {
                ...ex,
                exerciseId: pick.id,
                exerciseName: pick.name,
                needsManualPick: false,
              }
            : ex,
        ),
      },
    };
  }
  if (draft.mode === "program" && draft.program) {
    return {
      ...draft,
      program: {
        ...draft.program,
        routines: draft.program.routines.map((r, ri) =>
          ri !== routineIndex
            ? r
            : {
                ...r,
                exercises: r.exercises.map((ex, ei) =>
                  ei === exerciseIndex
                    ? {
                        ...ex,
                        exerciseId: pick.id,
                        exerciseName: pick.name,
                        needsManualPick: false,
                      }
                    : ex,
                ),
              },
        ),
      },
    };
  }
  return draft;
}

export function importDraftNeedsPicks(draft: ImportDraft): boolean {
  const lists =
    draft.mode === "routine" && draft.routine
      ? [draft.routine.exercises]
      : draft.program?.routines.map((r) => r.exercises) ?? [];
  return lists.some((list) => list.some((ex) => !ex.exerciseId));
}

export function firstUnmatchedPick(
  draft: ImportDraft,
): { routineIndex: number; exerciseIndex: number } | null {
  if (draft.mode === "routine" && draft.routine) {
    const i = draft.routine.exercises.findIndex((ex) => !ex.exerciseId);
    return i >= 0 ? { routineIndex: 0, exerciseIndex: i } : null;
  }
  if (draft.mode === "program" && draft.program) {
    for (let ri = 0; ri < draft.program.routines.length; ri++) {
      const ei = draft.program.routines[ri].exercises.findIndex(
        (ex) => !ex.exerciseId,
      );
      if (ei >= 0) return { routineIndex: ri, exerciseIndex: ei };
    }
  }
  return null;
}
