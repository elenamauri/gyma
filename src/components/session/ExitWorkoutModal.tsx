"use client";

import { Button } from "@/components/ui/primitives";

export function ExitWorkoutModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
        aria-labelledby="exit-workout-title"
        className="relative mx-auto w-full max-w-lg border-t border-hairline bg-chalk px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-xl sm:border sm:pb-4"
      >
        <h2
          id="exit-workout-title"
          className="font-display text-xl font-bold"
        >
          Uscire dall&apos;allenamento?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Serie completate, esercizio corrente e tempo verranno salvati. Potrai
          riprendere da dove hai lasciato.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="accent"
            className="flex-1"
            onClick={onConfirm}
          >
            Esci e riprendi dopo
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={onClose}
          >
            Continua allenamento
          </Button>
        </div>
      </div>
    </div>
  );
}
