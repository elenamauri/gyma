"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { createSessionFromRoutine } from "@/components/session/LiveSession";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { Button, EmptyState } from "@/components/ui/primitives";
import {
  RoutineAccordion,
  RoutineExerciseList,
  useRoutineStats,
} from "@/components/routines/RoutinePreview";

export default function RoutineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { ready, routines, upsertSession, deleteRoutine } = useAppStore();
  const { exercises } = useExerciseCatalog();
  const routine = routines.find((r) => r.id === id);
  const stats = useRoutineStats(routine, exercises);

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  if (!routine) {
    return (
      <EmptyState
        title="Routine non trovata"
        description="Potrebbe essere stata eliminata."
        action={
          <Link href="/routines">
            <Button>Torna ai programmi</Button>
          </Link>
        }
      />
    );
  }

  function start() {
    const session = createSessionFromRoutine(routine!);
    upsertSession(session);
    router.push(`/session/live?id=${session.id}`);
  }

  const updatedLabel = new Date(routine.updatedAt).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-5 pb-28">
      <div className="flex justify-end">
        <Link
          href={`/routines/${routine.id}/edit`}
          className="flex h-11 items-center px-2 text-sm text-muted touch-manipulation"
        >
          Modifica
        </Link>
      </div>

      <RoutineAccordion
        name={routine.name}
        subtitle={`Aggiornata ${updatedLabel}`}
        stats={stats}
        defaultOpen={false}
      />

      <RoutineExerciseList
        type={routine.type}
        exercises={routine.exercises}
        catalog={exercises}
      />

      <button
        type="button"
        className="text-sm text-muted underline underline-offset-2"
        onClick={() => {
          if (confirm("Eliminare questa routine?")) {
            deleteRoutine(routine.id);
            router.push(
              routine.programId
                ? `/routines/programs/${routine.programId}`
                : "/routines",
            );
          }
        }}
      >
        Elimina routine
      </button>

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] inset-x-0 z-30 border-t border-hairline bg-chalk/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Button type="button" variant="accent" className="w-full" onClick={start}>
            Inizia l&apos;allenamento
          </Button>
        </div>
      </div>
    </div>
  );
}
