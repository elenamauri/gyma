import type {
  AppData,
  BodyweightEntry,
  Program,
  Routine,
  Session,
  Settings,
} from "./types";
import { DEFAULT_SETTINGS, ROUTINE_COLORS, STORAGE_KEYS } from "./types";

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function pickRoutineColor(seed: string, index = 0): string {
  let h = index;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  return ROUTINE_COLORS[h % ROUTINE_COLORS.length];
}

export function getPrograms(): Program[] {
  return readJson(STORAGE_KEYS.programs, []);
}

export function savePrograms(programs: Program[]) {
  writeJson(STORAGE_KEYS.programs, programs);
}

export function getRoutines(): Routine[] {
  return readJson(STORAGE_KEYS.routines, []);
}

export function saveRoutines(routines: Routine[]) {
  writeJson(STORAGE_KEYS.routines, routines);
}

/**
 * Ensure every routine has programId + color.
 * Orphan routines land in a "Generale" program created once if needed.
 */
export function migrateProgramsAndRoutines(): {
  programs: Program[];
  routines: Routine[];
} {
  let programs = getPrograms();
  let routines = getRoutines() as Array<Partial<Routine> & { id: string; name: string }>;
  let dirtyPrograms = false;
  let dirtyRoutines = false;

  const programIds = new Set(programs.map((p) => p.id));
  const needsHome = routines.some(
    (r) => !r.programId || !programIds.has(r.programId),
  );

  if (needsHome) {
    let home = programs.find((p) => p.name === "Generale") ?? programs[0];
    if (!home) {
      const now = new Date().toISOString();
      home = {
        id: uid(),
        name: "Generale",
        createdAt: now,
        updatedAt: now,
      };
      programs = [home, ...programs];
      dirtyPrograms = true;
      programIds.add(home.id);
    }
    routines = routines.map((r, i) => {
      const programId =
        r.programId && programIds.has(r.programId) ? r.programId : home!.id;
      const color = r.color || pickRoutineColor(r.id || r.name, i);
      if (programId !== r.programId || color !== r.color) dirtyRoutines = true;
      return { ...r, programId, color } as Routine;
    });
  } else {
    routines = routines.map((r, i) => {
      if (r.color) return r as Routine;
      dirtyRoutines = true;
      return {
        ...(r as Routine),
        color: pickRoutineColor(r.id || r.name, i),
      };
    });
  }

  if (dirtyPrograms) savePrograms(programs);
  if (dirtyRoutines) saveRoutines(routines as Routine[]);

  return { programs, routines: routines as Routine[] };
}

export function getSessions(): Session[] {
  return readJson(STORAGE_KEYS.sessions, []);
}

export function saveSessions(sessions: Session[]) {
  writeJson(STORAGE_KEYS.sessions, sessions);
}

export function getBodyweightLog(): BodyweightEntry[] {
  return readJson(STORAGE_KEYS.bodyweightLog, []);
}

export function saveBodyweightLog(log: BodyweightEntry[]) {
  writeJson(STORAGE_KEYS.bodyweightLog, log);
}

export function getFavorites(): string[] {
  return readJson(STORAGE_KEYS.favorites, []);
}

export function saveFavorites(favorites: string[]) {
  writeJson(STORAGE_KEYS.favorites, favorites);
}

export function getRecentExerciseIds(): string[] {
  return readJson(STORAGE_KEYS.recentExerciseIds, []);
}

export function saveRecentExerciseIds(ids: string[]) {
  writeJson(STORAGE_KEYS.recentExerciseIds, ids.slice(0, 20));
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJson(STORAGE_KEYS.settings, {}) };
}

export function saveSettings(settings: Settings) {
  writeJson(STORAGE_KEYS.settings, settings);
}

export function getAllData(): AppData {
  const { programs, routines } = migrateProgramsAndRoutines();
  return {
    programs,
    routines,
    sessions: getSessions(),
    bodyweightLog: getBodyweightLog(),
    favorites: getFavorites(),
    recentExerciseIds: getRecentExerciseIds(),
    settings: getSettings(),
  };
}

export function importAllData(data: Partial<AppData>) {
  if (data.programs) savePrograms(data.programs);
  if (data.routines) saveRoutines(data.routines);
  if (data.sessions) saveSessions(data.sessions);
  if (data.bodyweightLog) saveBodyweightLog(data.bodyweightLog);
  if (data.favorites) saveFavorites(data.favorites);
  if (data.recentExerciseIds) saveRecentExerciseIds(data.recentExerciseIds);
  if (data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  // Normalize after import
  migrateProgramsAndRoutines();
}

export function exportAllData(): AppData {
  return getAllData();
}

export function trackRecentExercise(exerciseId: string) {
  const current = getRecentExerciseIds().filter((id) => id !== exerciseId);
  saveRecentExerciseIds([exerciseId, ...current]);
}

export function toggleFavorite(exerciseId: string): string[] {
  const current = getFavorites();
  const next = current.includes(exerciseId)
    ? current.filter((id) => id !== exerciseId)
    : [exerciseId, ...current];
  saveFavorites(next);
  return next;
}
