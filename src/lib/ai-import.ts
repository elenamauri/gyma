import type {
  AiRoutineImport,
  ExerciseIndexEntry,
  Routine,
  RoutineExerciseReps,
  RoutineExerciseTimed,
} from "./types";
import { fuzzyMatchExerciseName } from "./exercises";
import { uid } from "./storage";

export interface ResolvedImportExercise {
  importedName: string;
  exerciseId?: string;
  exerciseName?: string;
  suggestions: ExerciseIndexEntry[];
  needsManualPick: boolean;
  sets?: number;
  reps?: number;
  restSeconds: number;
  durationSeconds?: number;
  targetWeight?: number;
}

export interface ImportValidation {
  ok: boolean;
  error?: string;
  data?: AiRoutineImport;
}

export function parseAiRoutineJson(raw: string): ImportValidation {
  let parsed: unknown;
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: "JSON non valido. Incolla solo il JSON di Claude." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Il JSON deve essere un oggetto." };
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.name !== "string" || !obj.name.trim()) {
    return { ok: false, error: 'Campo "name" mancante o vuoto.' };
  }
  if (obj.type !== "reps" && obj.type !== "timed") {
    return { ok: false, error: 'Campo "type" deve essere "reps" o "timed".' };
  }
  if (!Array.isArray(obj.exercises) || obj.exercises.length === 0) {
    return { ok: false, error: 'Campo "exercises" deve essere un array non vuoto.' };
  }

  for (let i = 0; i < obj.exercises.length; i++) {
    const ex = obj.exercises[i] as Record<string, unknown>;
    if (typeof ex.name !== "string" || !ex.name.trim()) {
      return { ok: false, error: `Esercizio #${i + 1}: nome mancante.` };
    }
    if (obj.type === "reps") {
      if (typeof ex.sets !== "number" || typeof ex.reps !== "number") {
        return {
          ok: false,
          error: `Esercizio #${i + 1}: sets e reps obbligatori per type "reps".`,
        };
      }
    } else if (typeof ex.durationSeconds !== "number") {
      return {
        ok: false,
        error: `Esercizio #${i + 1}: durationSeconds obbligatorio per type "timed".`,
      };
    }
  }

  return { ok: true, data: parsed as AiRoutineImport };
}

export function resolveAiImport(
  data: AiRoutineImport,
  catalog: ExerciseIndexEntry[],
): ResolvedImportExercise[] {
  return data.exercises.map((ex) => {
    const match = fuzzyMatchExerciseName(ex.name, catalog);
    return {
      importedName: ex.name,
      exerciseId: match.matched?.id,
      exerciseName: match.matched?.name,
      suggestions: match.suggestions,
      needsManualPick: match.needsManualPick,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.restSeconds ?? 60,
      durationSeconds: ex.durationSeconds,
      targetWeight: ex.targetWeight,
    };
  });
}

export function buildRoutineFromResolved(
  name: string,
  type: "reps" | "timed",
  resolved: ResolvedImportExercise[],
): Routine | { error: string } {
  const incomplete = resolved.find((r) => !r.exerciseId || !r.exerciseName);
  if (incomplete) {
    return {
      error: `Seleziona un esercizio per "${incomplete.importedName}" prima di salvare.`,
    };
  }

  const now = new Date().toISOString();

  if (type === "reps") {
    const exercises: RoutineExerciseReps[] = resolved.map((r) => ({
      id: uid(),
      exerciseId: r.exerciseId!,
      exerciseName: r.exerciseName!,
      sets: r.sets ?? 3,
      reps: r.reps ?? 10,
      restSeconds: r.restSeconds,
      targetWeight: r.targetWeight,
    }));
    return {
      id: uid(),
      name,
      type,
      exercises,
      createdAt: now,
      updatedAt: now,
    };
  }

  const exercises: RoutineExerciseTimed[] = resolved.map((r) => ({
    id: uid(),
    exerciseId: r.exerciseId!,
    exerciseName: r.exerciseName!,
    durationSeconds: r.durationSeconds ?? 40,
    restSeconds: r.restSeconds,
  }));

  return {
    id: uid(),
    name,
    type,
    exercises,
    createdAt: now,
    updatedAt: now,
  };
}
