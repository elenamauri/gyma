"use client";

import { Suspense } from "react";
import PickExercisesClient from "./PickExercisesClient";

export default function PickPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Caricamento…</p>}>
      <PickExercisesClient />
    </Suspense>
  );
}
