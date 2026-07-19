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
  const returnPath = `/routines/${id}/edit`;

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

  return <RoutineForm initial={routine} returnPath={returnPath} />;
}
