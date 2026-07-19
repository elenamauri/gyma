"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button, EmptyState } from "@/components/ui/primitives";

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;
  const { ready, programs, routines, deleteProgram } = useAppStore();

  const program = programs.find((p) => p.id === programId);

  const list = useMemo(
    () =>
      routines
        .filter((r) => r.programId === programId)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [routines, programId],
  );

  if (!ready) {
    return <p className="text-sm text-muted">Caricamento…</p>;
  }

  if (!program) {
    return (
      <EmptyState
        title="Programma non trovato"
        description="Potrebbe essere stato eliminato."
        action={
          <Link href="/routines">
            <Button type="button">Torna ai programmi</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">
          {list.length} {list.length === 1 ? "routine" : "routine"} in questo
          programma
        </p>
      </div>

      <ul className="divide-y divide-hairline">
        <li>
          <Link
            href={`/routines/new?programId=${encodeURIComponent(programId)}`}
            className="flex min-h-16 items-center gap-3 py-4 text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-dashed border-hairline text-xl leading-none"
              aria-hidden
            >
              +
            </span>
            <div className="min-w-0">
              <div className="font-medium text-ink">Nuova routine</div>
              <div className="text-xs text-muted">Aggiungi a questo programma</div>
            </div>
          </Link>
        </li>

        {list.map((r) => (
          <li key={r.id}>
            <Link
              href={`/routines/${r.id}`}
              className="flex min-h-16 items-center gap-3 py-4 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span
                className="h-10 w-10 shrink-0"
                style={{ backgroundColor: r.color || "#E1442C" }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.name}</div>
                <div className="text-xs text-muted">
                  {r.type === "reps" ? "Serie/reps" : "A tempo"} ·{" "}
                  {r.exercises.length} esercizi
                </div>
              </div>
              <span className="text-muted" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="text-sm text-accent touch-manipulation"
        onClick={() => {
          if (
            confirm(
              `Eliminare il programma “${program.name}” e tutte le sue routine?`,
            )
          ) {
            deleteProgram(program.id);
            router.replace("/routines");
          }
        }}
      >
        Elimina programma
      </button>
    </div>
  );
}
