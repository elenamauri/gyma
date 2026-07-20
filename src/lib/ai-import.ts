import type {
  AiProgramImport,
  AiRoutineImport,
  ExerciseIndexEntry,
  Program,
  Routine,
  RoutineExerciseReps,
  RoutineExerciseTimed,
  RoutineType,
} from "./types";
import { fuzzyMatchExerciseName } from "./exercises";
import { pickRoutineColor, uid } from "./storage";
import type { ImportRoutineDraft } from "./import-draft";

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

export type ParsedImport =
  | { kind: "routine"; routine: AiRoutineImport }
  | { kind: "program"; program: AiProgramImport };

export type ParseImportResult =
  | { ok: true; parsed: ParsedImport }
  | { ok: false; error: string };

function cleanImportJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

function validateExerciseList(
  type: RoutineType,
  exercises: unknown[],
  label: string,
): string | null {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return `${label}: "exercises" deve essere un array non vuoto.`;
  }
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i] as Record<string, unknown>;
    if (typeof ex.name !== "string" || !ex.name.trim()) {
      return `${label}, esercizio #${i + 1}: nome mancante.`;
    }
    if (type === "reps") {
      if (typeof ex.sets !== "number" || typeof ex.reps !== "number") {
        return `${label}, esercizio #${i + 1}: sets e reps obbligatori per type "reps".`;
      }
    } else if (typeof ex.durationSeconds !== "number") {
      return `${label}, esercizio #${i + 1}: durationSeconds obbligatorio per type "timed".`;
    }
  }
  return null;
}

function validateRoutineShape(
  obj: Record<string, unknown>,
  label: string,
): string | null {
  if (typeof obj.name !== "string" || !obj.name.trim()) {
    return `${label}: "name" mancante o vuoto.`;
  }
  if (obj.type !== "reps" && obj.type !== "timed") {
    return `${label}: "type" deve essere "reps" o "timed".`;
  }
  return validateExerciseList(
    obj.type as RoutineType,
    obj.exercises as unknown[],
    label,
  );
}

/** Parse JSON for a single routine or a full program (with "routines" array). */
export function parseAiImportJson(raw: string): ParseImportResult {
  let parsed: unknown;
  try {
    parsed = cleanImportJson(raw);
  } catch {
    return { ok: false, error: "JSON non valido. Incolla solo il JSON di Claude." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Il JSON deve essere un oggetto." };
  }

  const obj = parsed as Record<string, unknown>;

  if (Array.isArray(obj.routines)) {
    if (typeof obj.name !== "string" || !obj.name.trim()) {
      return { ok: false, error: 'Programma: campo "name" mancante o vuoto.' };
    }
    if (obj.routines.length === 0) {
      return {
        ok: false,
        error: 'Programma: "routines" deve contenere almeno una routine.',
      };
    }
    for (let i = 0; i < obj.routines.length; i++) {
      const r = obj.routines[i] as Record<string, unknown>;
      const err = validateRoutineShape(r, `Routine #${i + 1}`);
      if (err) return { ok: false, error: err };
    }
    return {
      ok: true,
      parsed: { kind: "program", program: parsed as AiProgramImport },
    };
  }

  const err = validateRoutineShape(obj, "Routine");
  if (err) return { ok: false, error: err };
  return {
    ok: true,
    parsed: { kind: "routine", routine: parsed as AiRoutineImport },
  };
}

export function parseAiRoutineJson(raw: string): ImportValidation {
  const result = parseAiImportJson(raw);
  if (!result.ok) return { ok: false, error: result.error };
  if (result.parsed.kind === "program") {
    return {
      ok: false,
      error:
        'JSON di programma rilevato. Usa "Valida e abbina" — verrà importato l\'intero programma.',
    };
  }
  return { ok: true, data: result.parsed.routine };
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

export function resolveProgramImport(
  data: AiProgramImport,
  catalog: ExerciseIndexEntry[],
): ImportRoutineDraft[] {
  return data.routines.map((routine) => ({
    name: routine.name,
    type: routine.type,
    exercises: resolveAiImport(routine, catalog),
  }));
}

export function buildRoutineFromResolved(
  name: string,
  type: RoutineType,
  resolved: ResolvedImportExercise[],
  programId: string,
): Routine | { error: string } {
  const incomplete = resolved.find((r) => !r.exerciseId || !r.exerciseName);
  if (incomplete) {
    return {
      error: `Seleziona un esercizio per "${incomplete.importedName}" prima di salvare.`,
    };
  }
  if (!programId) {
    return { error: "Seleziona un programma prima di salvare." };
  }

  const now = new Date().toISOString();
  const id = uid();

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
      id,
      name,
      type,
      programId,
      color: pickRoutineColor(id),
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
    id,
    name,
    type,
    programId,
    color: pickRoutineColor(id),
    exercises,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildProgramFromImport(
  programName: string,
  routineDrafts: ImportRoutineDraft[],
): { program: Program; routines: Routine[] } | { error: string } {
  const now = new Date().toISOString();
  const programId = uid();
  const program: Program = {
    id: programId,
    name: programName,
    createdAt: now,
    updatedAt: now,
  };

  const routines: Routine[] = [];
  for (const draft of routineDrafts) {
    const built = buildRoutineFromResolved(
      draft.name,
      draft.type,
      draft.exercises,
      programId,
    );
    if ("error" in built) return { error: built.error };
    routines.push(built);
  }

  return { program, routines };
}
