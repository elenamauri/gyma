import type {
  AppData,
  BodyweightEntry,
  Routine,
  Session,
  Settings,
} from "./types";
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./types";

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

export function getRoutines(): Routine[] {
  return readJson(STORAGE_KEYS.routines, []);
}

export function saveRoutines(routines: Routine[]) {
  writeJson(STORAGE_KEYS.routines, routines);
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
  return {
    routines: getRoutines(),
    sessions: getSessions(),
    bodyweightLog: getBodyweightLog(),
    favorites: getFavorites(),
    recentExerciseIds: getRecentExerciseIds(),
    settings: getSettings(),
  };
}

export function importAllData(data: Partial<AppData>) {
  if (data.routines) saveRoutines(data.routines);
  if (data.sessions) saveSessions(data.sessions);
  if (data.bodyweightLog) saveBodyweightLog(data.bodyweightLog);
  if (data.favorites) saveFavorites(data.favorites);
  if (data.recentExerciseIds) saveRecentExerciseIds(data.recentExerciseIds);
  if (data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
}

export function exportAllData(): AppData {
  return getAllData();
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
