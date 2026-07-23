"use client";

import { Button } from "@/components/ui/primitives";

export function SessionSettingsModal({
  open,
  soundEnabled,
  vibrationEnabled,
  onClose,
  onSoundChange,
  onVibrationChange,
}: {
  open: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onClose: () => void;
  onSoundChange: (enabled: boolean) => void;
  onVibrationChange: (enabled: boolean) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:items-center sm:justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Chiudi"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-settings-title"
        className="relative mx-auto w-full max-w-lg border-t border-hairline bg-chalk px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-xl sm:border sm:pb-4"
      >
        <h2
          id="session-settings-title"
          className="font-display text-xl font-bold"
        >
          Feedback
        </h2>
        <p className="mt-1 text-sm text-muted">
          Suono e vibrazione a fine esercizio o recupero.
        </p>

        <div className="mt-4 space-y-1">
          <label className="flex min-h-12 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => onSoundChange(e.target.checked)}
              className="h-5 w-5 accent-accent"
            />
            Suono
          </label>
          <label className="flex min-h-12 items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={vibrationEnabled}
              onChange={(e) => onVibrationChange(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-accent"
            />
            <span>
              Vibrazione
              <span className="mt-0.5 block text-xs text-muted">
                Su iPhone Safari non è supportata — usa il suono.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5">
          <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </div>
    </div>
  );
}
