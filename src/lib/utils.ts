export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
    return null;
  }
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}

export {
  unlockAudio,
  playRestEndSound,
  playTimedEndSound,
  vibrateRestEnd,
  vibrateTimedEnd,
} from "./feedback";

export function toDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeStreak(dateKeys: string[]): number {
  if (!dateKeys.length) return 0;
  const set = new Set(dateKeys);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  // If today has no workout, start from yesterday
  if (!set.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (set.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
