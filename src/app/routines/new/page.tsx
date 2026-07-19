"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoutineForm } from "@/components/routines/RoutineForm";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";

function NewRoutineInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, programs } = useAppStore();
  const programId = params.get("programId") ?? "";

  useEffect(() => {
    if (!ready) return;
    if (!programId && programs.length > 0) {
      router.replace(
        `/routines/new?programId=${encodeURIComponent(programs[0].id)}`,
      );
    }
  }, [ready, programId, programs, router]);

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  if (programs.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Crea prima un programma, poi aggiungi le routine.
        </p>
        <Link href="/routines/programs/new">
          <Button type="button" variant="accent">
            Crea programma
          </Button>
        </Link>
      </div>
    );
  }

  if (!programId) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  const returnPath = `/routines/new?programId=${encodeURIComponent(programId)}`;
  return <RoutineForm returnPath={returnPath} programId={programId} />;
}

export default function NewRoutinePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Caricamento…</p>}>
      <NewRoutineInner />
    </Suspense>
  );
}
