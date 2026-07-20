export type RoutineType = "reps" | "timed";
export type WeightUnit = "kg" | "lb";

export interface Exercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

export interface ExerciseIndexEntry {
  id: string;
  name: string;
  level: string;
  equipment: string | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  images: string[];
}

export interface ExerciseFacets {
  levels: string[];
  equipment: string[];
  categories: string[];
  primaryMuscles: string[];
}

export interface ExerciseIndex {
  exercises: ExerciseIndexEntry[];
  facets: ExerciseFacets;
}

export interface RoutineExerciseReps {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  targetWeight?: number;
  restSeconds: number;
  notes?: string;
}

export interface RoutineExerciseTimed {
  id: string;
  exerciseId: string;
  exerciseName: string;
  durationSeconds: number;
  restSeconds: number;
  notes?: string;
}

export interface Routine {
  id: string;
  name: string;
  type: RoutineType;
  exercises: RoutineExerciseReps[] | RoutineExerciseTimed[];
  /** Parent program (required for new routines; migrated for legacy). */
  programId: string;
  /** Tile color hex for program grid. */
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoggedSet {
  id: string;
  reps: number;
  weight?: number;
  rpe?: number;
  completed: boolean;
  completedAt?: string;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscles: string[];
  targetSets?: number;
  targetReps?: number;
  targetWeight?: number;
  restSeconds: number;
  durationSeconds?: number;
  sets: LoggedSet[];
  notes?: string;
  replacedFromId?: string;
}

export type SessionStatus = "active" | "completed" | "abandoned";

export interface Session {
  id: string;
  routineId?: string;
  routineName?: string;
  type: RoutineType;
  status: SessionStatus;
  exercises: SessionExercise[];
  notes?: string;
  startedAt: string;
  completedAt?: string;
  /** Active time accumulated while away from live view (seconds). */
  pausedElapsedSeconds?: number;
  /** When the timer last resumed; undefined while paused. */
  resumedAt?: string;
  /** Workout duration at completion (active seconds, excludes pauses). */
  durationSeconds?: number;
  prs?: PersonalRecord[];
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  kind: "weight" | "volume";
  value: number;
  previousValue?: number;
  sessionId: string;
  achievedAt: string;
}

export interface BodyweightEntry {
  id: string;
  weight: number;
  date: string;
  note?: string;
}

export interface Settings {
  unit: WeightUnit;
  defaultRestSeconds: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  /** Keep screen on during live workout (default on). */
  wakeLockEnabled: boolean;
  /** Nome mostrato in dashboard (“Ciao …”). */
  displayName?: string;
}

export interface AppData {
  programs: Program[];
  routines: Routine[];
  sessions: Session[];
  bodyweightLog: BodyweightEntry[];
  favorites: string[];
  recentExerciseIds: string[];
  settings: Settings;
}

export const STORAGE_KEYS = {
  programs: "gyma:programs",
  routines: "gyma:routines",
  sessions: "gyma:sessions",
  bodyweightLog: "gyma:bodyweightLog",
  favorites: "gyma:favorites",
  recentExerciseIds: "gyma:recentExerciseIds",
  settings: "gyma:settings",
} as const;

/** Palette for routine tiles inside a program. */
export const ROUTINE_COLORS = [
  "#E1442C",
  "#2C5EE1",
  "#1A9E6A",
  "#D97706",
  "#7C3AED",
  "#0D9488",
  "#DB2777",
  "#4B5563",
] as const;

export const DEFAULT_SETTINGS: Settings = {
  unit: "kg",
  defaultRestSeconds: 90,
  soundEnabled: true,
  vibrationEnabled: true,
  wakeLockEnabled: true,
};

export const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export interface AiRoutineImport {
  name: string;
  type: RoutineType;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    restSeconds?: number;
    durationSeconds?: number;
    targetWeight?: number;
  }>;
}

export interface FuzzyMatchResult {
  importedName: string;
  matched?: ExerciseIndexEntry;
  suggestions: ExerciseIndexEntry[];
  confidence: number;
  needsManualPick: boolean;
}
