"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { SessionDetail } from "@/components/history/SessionSummary";

export default function HistoryDetailRoute() {
  const params = useParams();
  return (
    <Suspense fallback={<p className="text-sm text-muted">Caricamento…</p>}>
      <SessionDetail sessionId={params.id as string} />
    </Suspense>
  );
}
