"use client";

import { useEffect, useState } from "react";

/** Breve splash a schermo intero con logo centrato (solo al primo load del layout). */
export function IntroSplash() {
  const [phase, setPhase] = useState<"show" | "out" | "gone">("show");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("gone");
      return;
    }

    const outTimer = window.setTimeout(() => setPhase("out"), 900);
    const goneTimer = window.setTimeout(() => setPhase("gone"), 1250);
    return () => {
      window.clearTimeout(outTimer);
      window.clearTimeout(goneTimer);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center bg-chalk transition-opacity duration-300 ${
        phase === "out" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden={phase === "out"}
      role="presentation"
    >
      <div className="flex flex-col items-center">
        <span className="font-display text-5xl font-bold tracking-tight text-ink sm:text-6xl">
          GYMA
        </span>
        <span
          className="mt-4 block h-1 w-14 bg-accent"
          aria-hidden
        />
      </div>
    </div>
  );
}
