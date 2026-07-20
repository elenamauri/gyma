"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import type { Program, Routine } from "@/lib/types";
import { Button, EmptyState } from "@/components/ui/primitives";

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;
  const {
    ready,
    programs,
    routines,
    deleteProgram,
    deleteRoutine,
    upsertRoutine,
  } = useAppStore();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [moveRoutine, setMoveRoutine] = useState<Routine | null>(null);

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

  const otherPrograms = useMemo(
    () =>
      programs
        .filter((p) => p.id !== programId)
        .sort((a, b) => a.name.localeCompare(b.name, "it")),
    [programs, programId],
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

  function removeRoutine(routine: Routine) {
    if (!confirm(`Eliminare la routine “${routine.name}”?`)) return;
    deleteRoutine(routine.id);
    setMenuId(null);
  }

  function moveToProgram(target: Program) {
    if (!moveRoutine) return;
    upsertRoutine({
      ...moveRoutine,
      programId: target.id,
      updatedAt: new Date().toISOString(),
    });
    setMoveRoutine(null);
    setMenuId(null);
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
              <div className="text-xs text-muted">
                Aggiungi a questo programma
              </div>
            </div>
          </Link>
        </li>

        {list.map((r) => (
          <li key={r.id} className="flex min-h-16 items-center gap-1 py-2">
            <Link
              href={`/routines/${r.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 py-2 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
            </Link>
            <RoutineRowMenu
              open={menuId === r.id}
              onToggle={() =>
                setMenuId((id) => (id === r.id ? null : r.id))
              }
              onDelete={() => removeRoutine(r)}
              onMove={() => {
                setMenuId(null);
                setMoveRoutine(r);
              }}
              canMove={otherPrograms.length > 0}
            />
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

      {moveRoutine && (
        <MoveRoutineModal
          routineName={moveRoutine.name}
          programs={otherPrograms}
          onClose={() => setMoveRoutine(null)}
          onPick={moveToProgram}
        />
      )}
    </div>
  );
}

function RoutineRowMenu({
  open,
  onToggle,
  onDelete,
  onMove,
  canMove,
}: {
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onMove: () => void;
  canMove: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onScroll() {
      onToggle();
    }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open, onToggle]);

  const menu =
    open && pos
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[200]"
              aria-label="Chiudi menu"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            />
            <div
              role="menu"
              className="fixed z-[210] min-w-[11rem] border border-hairline bg-chalk py-1 shadow-lg"
              style={{ top: pos.top, right: pos.right }}
            >
              {canMove && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex min-h-11 w-full items-center px-3 text-left text-sm touch-manipulation hover:bg-ink/[0.03]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove();
                  }}
                >
                  Sposta in…
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className="flex min-h-11 w-full items-center px-3 text-left text-sm text-accent touch-manipulation hover:bg-ink/[0.03]"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                Elimina
              </button>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        className="flex h-11 w-11 items-center justify-center text-muted touch-manipulation"
        aria-label="Opzioni routine"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        ⋯
      </button>
      {menu}
    </div>
  );
}

function MoveRoutineModal({
  routineName,
  programs,
  onClose,
  onPick,
}: {
  routineName: string;
  programs: Program[];
  onClose: () => void;
  onPick: (program: Program) => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:items-center sm:justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Chiudi"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-routine-title"
        className="relative mx-auto w-full max-w-lg border-t border-hairline bg-chalk px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-xl sm:border sm:pb-4"
      >
        <h2
          id="move-routine-title"
          className="font-display text-xl font-bold"
        >
          Sposta routine
        </h2>
        <p className="mt-1 text-sm text-muted">
          “{routineName}” → scegli il programma destinazione
        </p>
        {programs.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Nessun altro programma disponibile.
          </p>
        ) : (
          <ul className="mt-4 max-h-64 divide-y divide-hairline overflow-y-auto">
            {programs.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center py-3 text-left text-sm font-medium touch-manipulation hover:text-accent"
                  onClick={() => onPick(p)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="ghost"
          className="mt-3 w-full"
          onClick={onClose}
        >
          Annulla
        </Button>
      </div>
    </div>
  );
}
