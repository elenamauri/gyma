"use client";

import { Suspense } from "react";
import SessionPickClient from "./SessionPickClient";

export default function SessionPickPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Caricamento…</p>}>
      <SessionPickClient />
    </Suspense>
  );
}
