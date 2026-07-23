/** Shared Web Audio helpers — unlock on first user gesture (required on iOS). */

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

/** Call from a click/touch handler so later beeps work on iOS/Safari. */
export async function unlockAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    // Silent blip to fully unlock some browsers
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
  } catch {
    // ignore
  }
}

function beep(freq: number, durationSec: number, volume = 0.12) {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
      osc.stop(now + durationSec + 0.02);
    } catch {
      // ignore
    }
  });
}

export function playRestEndSound(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  beep(880, 0.18, 0.14);
  window.setTimeout(() => beep(1175, 0.28, 0.12), 160);
}

export function playTimedEndSound(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  beep(660, 0.15, 0.12);
  window.setTimeout(() => beep(880, 0.2, 0.12), 140);
}

export function vibrateRestEnd(enabled: boolean) {
  if (!enabled || typeof navigator === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate([140, 70, 140, 70, 200]);
    }
  } catch {
    // ignore — unsupported on iOS Safari
  }
}

export function vibrateTimedEnd(enabled: boolean) {
  if (!enabled || typeof navigator === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate([80, 40, 80]);
    }
  } catch {
    // ignore
  }
}
