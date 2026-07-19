"use client";

import { useEffect, useRef } from "react";
import { requestWakeLock } from "@/lib/utils";

export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) {
      sentinelRef.current?.release().catch(() => undefined);
      sentinelRef.current = null;
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      const sentinel = await requestWakeLock();
      if (cancelled) {
        await sentinel?.release().catch(() => undefined);
        return;
      }
      sentinelRef.current = sentinel;
    };

    acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && enabled) {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinelRef.current?.release().catch(() => undefined);
      sentinelRef.current = null;
    };
  }, [enabled]);
}
