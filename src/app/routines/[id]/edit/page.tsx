"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { RoutineForm } from "@/components/routines/RoutineForm";
import { Button, EmptyState } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";

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
    <div className="space-y-5">
      <PageHeader
        title="Modifica routine"
        description={routine.name}
        backHref={`/routines/${routine.id}`}
        backLabel="Dettaglio"
      />
      <RoutineForm initial={routine} />
    </div>
  );
}
