import type { Session } from "./types";
import { detectPRs } from "./pr";

export const ACTIVE_SESSION_KEY = "gyma:activeSessionId";

export function getActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function setActiveSessionId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(ACTIVE_SESSION_KEY, id);
  else localStorage.removeItem(ACTIVE_SESSION_KEY);
}

/** Elapsed workout seconds (excludes time while paused / away from live view). */
export function getSessionElapsedSeconds(
  session: Session,
  nowMs = Date.now(),
): number {
  const base = session.pausedElapsedSeconds ?? 0;
  if (
    session.pausedElapsedSeconds !== undefined &&
    session.resumedAt === undefined
  ) {
    return base;
  }
  const from = session.resumedAt ?? session.startedAt;
  return (
    base + Math.floor((nowMs - new Date(from).getTime()) / 1000)
  );
}

export function isSessionPaused(session: Session): boolean {
  return (
    session.status === "active" &&
    session.pausedElapsedSeconds !== undefined &&
    session.resumedAt === undefined
  );
}

export function pauseSession(session: Session, nowMs = Date.now()): Session {
  if (session.status !== "active") return session;
  if (
    session.pausedElapsedSeconds !== undefined &&
    session.resumedAt === undefined
  ) {
    return session;
  }
  const from = session.resumedAt ?? session.startedAt;
  const base = session.pausedElapsedSeconds ?? 0;
  const elapsed =
    base + Math.floor((nowMs - new Date(from).getTime()) / 1000);
  return {
    ...session,
    pausedElapsedSeconds: Math.max(0, elapsed),
    resumedAt: undefined,
  };
}

export function resumeSession(session: Session): Session {
  if (session.status !== "active") return session;
  if (session.resumedAt) return session;
  return {
    ...session,
    resumedAt: new Date().toISOString(),
  };
}

export function completeSession(
  session: Session,
  allSessions: Session[],
): Session {
  const elapsed = getSessionElapsedSeconds(session);
  const completed: Session = {
    ...session,
    status: "completed",
    completedAt: new Date().toISOString(),
    durationSeconds: elapsed,
    resumedAt: undefined,
  };
  const previous = allSessions.filter(
    (s) => s.id !== session.id && s.status === "completed",
  );
  completed.prs = detectPRs(completed, previous);
  return completed;
}

export function formatSessionElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
}

export function findActiveSession(sessions: Session[]): Session | undefined {
  const id = getActiveSessionId();
  const byId = id ? sessions.find((s) => s.id === id && s.status === "active") : undefined;
  if (byId) return byId;
  return sessions.find((s) => s.status === "active");
}
