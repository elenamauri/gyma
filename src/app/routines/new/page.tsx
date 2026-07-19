"use client";

import { RoutineForm } from "@/components/routines/RoutineForm";

export default function NewRoutinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Nuova routine
        </h1>
        <p className="mt-1 text-sm text-muted">
          Scegli tipo, esercizi, serie/reps o durate.
        </p>
      </div>
      <RoutineForm />
    </div>
  );
}
