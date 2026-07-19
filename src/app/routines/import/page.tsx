"use client";

import { Suspense } from "react";
import { AiRoutineImportPanel } from "@/components/routines/AiRoutineImportPanel";

export default function RoutineImportPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Caricamento…</p>}>
      <AiRoutineImportPanel />
    </Suspense>
  );
}
