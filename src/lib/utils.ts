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

export function playRestEndSound(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // ignore
  }
}

export function vibrateRestEnd(enabled: boolean) {
  if (!enabled || typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }
  navigator.vibrate([120, 60, 120]);
}

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
