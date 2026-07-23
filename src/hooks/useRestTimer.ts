"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playRestEndSound, vibrateRestEnd } from "@/lib/feedback";

interface UseRestTimerOptions {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onComplete?: () => void;
}

export function useRestTimer({
  soundEnabled,
  vibrationEnabled,
  onComplete,
}: UseRestTimerOptions) {
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const endAtRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stop = useCallback(() => {
    setRunning(false);
    endAtRef.current = null;
    setRemaining(0);
    setTotal(0);
  }, []);

  const start = useCallback((seconds: number) => {
    const s = Math.max(1, Math.round(seconds));
    setTotal(s);
    setRemaining(s);
    endAtRef.current = Date.now() + s * 1000;
    setRunning(true);
  }, []);

  // Keep ticking across brief tab freezes using absolute end time.
  useEffect(() => {
    if (!running) return;
    let completed = false;
    const tick = () => {
      if (!endAtRef.current || completed) return;
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        completed = true;
        setRunning(false);
        endAtRef.current = null;
        playRestEndSound(soundEnabled);
        vibrateRestEnd(vibrationEnabled);
        onCompleteRef.current?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    function onVisible() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [running, soundEnabled, vibrationEnabled]);

  const progress = total > 0 ? remaining / total : 0;

  return { total, remaining, running, progress, start, stop };
}
