"use client";

import { Suspense } from "react";
import ImportPickClient from "./ImportPickClient";

export default function ImportPickPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Caricamento…</p>}>
      <ImportPickClient />
    </Suspense>
  );
}
