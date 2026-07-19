"use client";

import { RoutineForm } from "@/components/routines/RoutineForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewRoutinePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Nuova routine"
        description="Scegli tipo, esercizi, serie/reps o durate."
        backHref="/routines"
        backLabel="Routine"
      />
      <RoutineForm />
    </div>
  );
}
