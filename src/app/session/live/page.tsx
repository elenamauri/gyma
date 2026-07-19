"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveSessionView } from "@/components/session/LiveSession";

function LiveInner() {
  const params = useSearchParams();
  const id = params.get("id");

  if (!id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted">Nessuna sessione specificata.</p>
      </div>
    );
  }

  return <LiveSessionView sessionId={id} />;
}

export default function LiveSessionPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted">Caricamento sessione…</p>}>
      <LiveInner />
    </Suspense>
  );
}
