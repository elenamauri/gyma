"use client";

import { RoutineForm } from "@/components/routines/RoutineForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewRoutinePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Nuova routine"
        description="Configura nome, tipo ed esercizi."
        backHref="/routines"
        backLabel="Routine"
      />
      <RoutineForm returnPath="/routines/new" />
    </div>
  );
}
