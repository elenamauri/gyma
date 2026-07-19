"use client";

import { formatDuration } from "@/lib/units";

export function RestTimerBar({
  remaining,
  progress,
  running,
  onSkip,
}: {
  remaining: number;
  progress: number;
  running: boolean;
  onSkip?: () => void;
}) {
  if (!running && remaining <= 0) return null;

  return (
    <div className="w-full" role="timer" aria-live="polite" aria-atomic="true">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">Recupero</span>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-lg tabular-nums text-accent">
            {formatDuration(remaining)}
          </span>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-muted underline underline-offset-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Salta
            </button>
          )}
        </div>
      </div>
      <div className="h-[3px] w-full bg-ink/10 overflow-hidden">
        <div
          className="h-full bg-accent origin-left motion-safe:transition-[width] motion-safe:duration-200 motion-reduce:transition-none"
          style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
      </div>
    </div>
  );
}
