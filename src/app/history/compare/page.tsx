"use client";

import { Suspense } from "react";
import { SessionCompare } from "@/components/history/SessionCompare";

export default function HistoryCompareRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Caricamento…</p>}>
      <SessionCompare />
    </Suspense>
  );
}
