"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  BodyweightEntry,
  Routine,
  Session,
  Settings,
} from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import {
  exportAllData,
  getAllData,
  importAllData,
  saveBodyweightLog,
  saveRecentExerciseIds,
  saveRoutines,
  saveSessions,
  saveSettings,
  trackRecentExercise,
  toggleFavorite as toggleFavoriteStorage,
} from "@/lib/storage";

interface AppStoreValue {
  ready: boolean;
  routines: Routine[];
  sessions: Session[];
  bodyweightLog: BodyweightEntry[];
  favorites: string[];
  recentExerciseIds: string[];
  settings: Settings;
  setRoutines: (routines: Routine[]) => void;
  upsertRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  setSessions: (sessions: Session[]) => void;
  upsertSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  setBodyweightLog: (log: BodyweightEntry[]) => void;
  toggleFavorite: (exerciseId: string) => void;
  markRecent: (exerciseId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  exportData: () => AppData;
  importData: (data: Partial<AppData>) => void;
  refresh: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [routines, setRoutinesState] = useState<Routine[]>([]);
  const [sessions, setSessionsState] = useState<Session[]>([]);
  const [bodyweightLog, setBodyweightState] = useState<BodyweightEntry[]>([]);
  const [favorites, setFavoritesState] = useState<string[]>([]);
  const [recentExerciseIds, setRecentState] = useState<string[]>([]);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);

  const refresh = useCallback(() => {
    const data = getAllData();
    setRoutinesState(data.routines);
    setSessionsState(data.sessions);
    setBodyweightState(data.bodyweightLog);
    setFavoritesState(data.favorites);
    setRecentState(data.recentExerciseIds);
    setSettingsState(data.settings);
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
  }, [refresh]);

  const setRoutines = useCallback((next: Routine[]) => {
    setRoutinesState(next);
    saveRoutines(next);
  }, []);

  const upsertRoutine = useCallback(
    (routine: Routine) => {
      setRoutinesState((prev) => {
        const idx = prev.findIndex((r) => r.id === routine.id);
        const next =
          idx >= 0
            ? prev.map((r) => (r.id === routine.id ? routine : r))
            : [routine, ...prev];
        saveRoutines(next);
        return next;
      });
    },
    [],
  );

  const deleteRoutine = useCallback((id: string) => {
    setRoutinesState((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRoutines(next);
      return next;
    });
  }, []);

  const setSessions = useCallback((next: Session[]) => {
    setSessionsState(next);
    saveSessions(next);
  }, []);

  const upsertSession = useCallback((session: Session) => {
    setSessionsState((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id);
      const next =
        idx >= 0
          ? prev.map((s) => (s.id === session.id ? session : s))
          : [session, ...prev];
      saveSessions(next);
      return next;
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessionsState((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
  }, []);

  const setBodyweightLog = useCallback((log: BodyweightEntry[]) => {
    setBodyweightState(log);
    saveBodyweightLog(log);
  }, []);

  const toggleFavorite = useCallback((exerciseId: string) => {
    const next = toggleFavoriteStorage(exerciseId);
    setFavoritesState(next);
  }, []);

  const markRecent = useCallback((exerciseId: string) => {
    trackRecentExercise(exerciseId);
    setRecentState((prev) => {
      const next = [exerciseId, ...prev.filter((id) => id !== exerciseId)].slice(
        0,
        20,
      );
      saveRecentExerciseIds(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const exportData = useCallback(() => exportAllData(), []);

  const importData = useCallback(
    (data: Partial<AppData>) => {
      importAllData(data);
      refresh();
    },
    [refresh],
  );

  const value = useMemo<AppStoreValue>(
    () => ({
      ready,
      routines,
      sessions,
      bodyweightLog,
      favorites,
      recentExerciseIds,
      settings,
      setRoutines,
      upsertRoutine,
      deleteRoutine,
      setSessions,
      upsertSession,
      deleteSession,
      setBodyweightLog,
      toggleFavorite,
      markRecent,
      updateSettings,
      exportData,
      importData,
      refresh,
    }),
    [
      ready,
      routines,
      sessions,
      bodyweightLog,
      favorites,
      recentExerciseIds,
      settings,
      setRoutines,
      upsertRoutine,
      deleteRoutine,
      setSessions,
      upsertSession,
      deleteSession,
      setBodyweightLog,
      toggleFavorite,
      markRecent,
      updateSettings,
      exportData,
      importData,
      refresh,
    ],
  );

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
