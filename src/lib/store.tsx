"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  BodyweightEntry,
  Program,
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
  savePrograms,
  saveRecentExerciseIds,
  saveRoutines,
  saveSessions,
  saveSettings,
  trackRecentExercise,
  toggleFavorite as toggleFavoriteStorage,
} from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import {
  fetchCloudData,
  pushCloudData,
  shouldPreferCloud,
} from "@/lib/supabase/sync";

type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface AppStoreValue {
  ready: boolean;
  programs: Program[];
  routines: Routine[];
  sessions: Session[];
  bodyweightLog: BodyweightEntry[];
  favorites: string[];
  recentExerciseIds: string[];
  settings: Settings;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  setPrograms: (programs: Program[]) => void;
  upsertProgram: (program: Program) => void;
  deleteProgram: (id: string) => void;
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
  syncNow: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady, configured } = useAuth();
  const [ready, setReady] = useState(false);
  const [programs, setProgramsState] = useState<Program[]>([]);
  const [routines, setRoutinesState] = useState<Routine[]>([]);
  const [sessions, setSessionsState] = useState<Session[]>([]);
  const [bodyweightLog, setBodyweightState] = useState<BodyweightEntry[]>([]);
  const [favorites, setFavoritesState] = useState<string[]>([]);
  const [recentExerciseIds, setRecentState] = useState<string[]>([]);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedUser = useRef<string | null>(null);

  const applyData = useCallback((data: AppData) => {
    setProgramsState(data.programs ?? []);
    setRoutinesState(data.routines);
    setSessionsState(data.sessions);
    setBodyweightState(data.bodyweightLog);
    setFavoritesState(data.favorites);
    setRecentState(data.recentExerciseIds);
    setSettingsState(data.settings);
  }, []);

  const refresh = useCallback(() => {
    applyData(getAllData());
  }, [applyData]);

  const scheduleCloudPush = useCallback(() => {
    if (!configured || !user) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        setSyncStatus("syncing");
        setSyncError(null);
        const updatedAt = await pushCloudData(getAllData());
        setLastSyncedAt(updatedAt);
        setSyncStatus("synced");
      } catch (err) {
        setSyncStatus("error");
        setSyncError(err instanceof Error ? err.message : "Sync fallita");
      }
    }, 800);
  }, [configured, user]);

  const persistAndSync = useCallback(
    (mutateLocal: () => void) => {
      mutateLocal();
      scheduleCloudPush();
    },
    [scheduleCloudPush],
  );

  const syncNow = useCallback(async () => {
    if (!configured || !user) {
      setSyncStatus("offline");
      return;
    }
    try {
      setSyncStatus("syncing");
      setSyncError(null);
      const updatedAt = await pushCloudData(getAllData());
      setLastSyncedAt(updatedAt);
      setSyncStatus("synced");
    } catch (err) {
      setSyncStatus("error");
      setSyncError(err instanceof Error ? err.message : "Sync fallita");
    }
  }, [configured, user]);

  // Initial local load
  useEffect(() => {
    if (!authReady) return;
    refresh();
    setReady(true);
  }, [authReady, refresh]);

  // Pull from cloud when user logs in
  useEffect(() => {
    if (!authReady || !ready) return;

    if (!configured || !user) {
      hydratedUser.current = null;
      setSyncStatus(configured ? "offline" : "idle");
      return;
    }

    if (hydratedUser.current === user.id) return;
    hydratedUser.current = user.id;

    let cancelled = false;
    (async () => {
      try {
        setSyncStatus("syncing");
        setSyncError(null);
        const local = getAllData();
        const cloud = await fetchCloudData();
        if (cancelled) return;

        if (shouldPreferCloud(local, cloud) && cloud) {
          importAllData(cloud.payload);
          applyData(getAllData());
          setLastSyncedAt(cloud.updatedAt);
          setSyncStatus("synced");
        } else {
          const updatedAt = await pushCloudData(local);
          if (cancelled) return;
          setLastSyncedAt(updatedAt);
          setSyncStatus("synced");
        }
      } catch (err) {
        if (cancelled) return;
        setSyncStatus("error");
        setSyncError(err instanceof Error ? err.message : "Sync fallita");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, ready, configured, user, applyData]);

  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  const setPrograms = useCallback(
    (next: Program[]) => {
      setProgramsState(next);
      persistAndSync(() => savePrograms(next));
    },
    [persistAndSync],
  );

  const upsertProgram = useCallback(
    (program: Program) => {
      setProgramsState((prev) => {
        const idx = prev.findIndex((p) => p.id === program.id);
        const next =
          idx >= 0
            ? prev.map((p) => (p.id === program.id ? program : p))
            : [program, ...prev];
        persistAndSync(() => savePrograms(next));
        return next;
      });
    },
    [persistAndSync],
  );

  const deleteProgram = useCallback(
    (id: string) => {
      setProgramsState((prevPrograms) => {
        const nextPrograms = prevPrograms.filter((p) => p.id !== id);
        setRoutinesState((prevRoutines) => {
          const nextRoutines = prevRoutines.filter((r) => r.programId !== id);
          persistAndSync(() => {
            savePrograms(nextPrograms);
            saveRoutines(nextRoutines);
          });
          return nextRoutines;
        });
        return nextPrograms;
      });
    },
    [persistAndSync],
  );

  const setRoutines = useCallback(
    (next: Routine[]) => {
      setRoutinesState(next);
      persistAndSync(() => saveRoutines(next));
    },
    [persistAndSync],
  );

  const upsertRoutine = useCallback(
    (routine: Routine) => {
      setRoutinesState((prev) => {
        const idx = prev.findIndex((r) => r.id === routine.id);
        const next =
          idx >= 0
            ? prev.map((r) => (r.id === routine.id ? routine : r))
            : [routine, ...prev];
        persistAndSync(() => saveRoutines(next));
        return next;
      });
    },
    [persistAndSync],
  );

  const deleteRoutine = useCallback(
    (id: string) => {
      setRoutinesState((prev) => {
        const next = prev.filter((r) => r.id !== id);
        persistAndSync(() => saveRoutines(next));
        return next;
      });
    },
    [persistAndSync],
  );

  const setSessions = useCallback(
    (next: Session[]) => {
      setSessionsState(next);
      persistAndSync(() => saveSessions(next));
    },
    [persistAndSync],
  );

  const upsertSession = useCallback(
    (session: Session) => {
      setSessionsState((prev) => {
        const idx = prev.findIndex((s) => s.id === session.id);
        const next =
          idx >= 0
            ? prev.map((s) => (s.id === session.id ? session : s))
            : [session, ...prev];
        persistAndSync(() => saveSessions(next));
        return next;
      });
    },
    [persistAndSync],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessionsState((prev) => {
        const next = prev.filter((s) => s.id !== id);
        persistAndSync(() => saveSessions(next));
        return next;
      });
    },
    [persistAndSync],
  );

  const setBodyweightLog = useCallback(
    (log: BodyweightEntry[]) => {
      setBodyweightState(log);
      persistAndSync(() => saveBodyweightLog(log));
    },
    [persistAndSync],
  );

  const toggleFavorite = useCallback(
    (exerciseId: string) => {
      const next = toggleFavoriteStorage(exerciseId);
      setFavoritesState(next);
      scheduleCloudPush();
    },
    [scheduleCloudPush],
  );

  const markRecent = useCallback(
    (exerciseId: string) => {
      trackRecentExercise(exerciseId);
      setRecentState((prev) => {
        const next = [
          exerciseId,
          ...prev.filter((id) => id !== exerciseId),
        ].slice(0, 20);
        saveRecentExerciseIds(next);
        scheduleCloudPush();
        return next;
      });
    },
    [scheduleCloudPush],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...patch };
        persistAndSync(() => saveSettings(next));
        return next;
      });
    },
    [persistAndSync],
  );

  const exportData = useCallback(() => exportAllData(), []);

  const importData = useCallback(
    (data: Partial<AppData>) => {
      importAllData(data);
      refresh();
      scheduleCloudPush();
    },
    [refresh, scheduleCloudPush],
  );

  const value = useMemo<AppStoreValue>(
    () => ({
      ready,
      programs,
      routines,
      sessions,
      bodyweightLog,
      favorites,
      recentExerciseIds,
      settings,
      syncStatus,
      syncError,
      lastSyncedAt,
      setPrograms,
      upsertProgram,
      deleteProgram,
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
      syncNow,
    }),
    [
      ready,
      programs,
      routines,
      sessions,
      bodyweightLog,
      favorites,
      recentExerciseIds,
      settings,
      syncStatus,
      syncError,
      lastSyncedAt,
      setPrograms,
      upsertProgram,
      deleteProgram,
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
      syncNow,
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
