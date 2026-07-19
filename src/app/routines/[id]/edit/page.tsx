"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { RoutineForm } from "@/components/routines/RoutineForm";
import { Button, EmptyState } from "@/components/ui/primitives";

export default function EditRoutinePage() {
  const params = useParams();
  const id = params.id as string;
  const { routines, ready } = useAppStore();
  const routine = routines.find((r) => r.id === id);

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  if (!routine) {
    return (
      <EmptyState
        title="Routine non trovata"
        description="Non puoi modificare una routine inesistente."
        action={
          <Link href="/routines">
            <Button>Torna alle routine</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/routines/${routine.id}`} className="text-sm text-muted hover:text-ink">
          ← {routine.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Modifica routine
        </h1>
      </div>
      <RoutineForm initial={routine} />
    </div>
  );
}
