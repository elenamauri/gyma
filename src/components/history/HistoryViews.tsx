"use client";

import { useMemo } from "react";
import type { Session } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/storage";
import { setActiveSessionId } from "@/lib/session-active";
import { computeStreak, toDateKey } from "@/lib/utils";
import { Button, EmptyState, Mono } from "@/components/ui/primitives";
import { CalendarStreak } from "@/components/history/CalendarStreak";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function HistoryPage() {
  const router = useRouter();
  const { sessions, upsertSession, deleteSession } = useAppStore();
  const completed = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "completed")
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? b.startedAt).getTime() -
            new Date(a.completedAt ?? a.startedAt).getTime(),
        ),
    [sessions],
  );

  const dateKeys = completed.map((s) =>
    toDateKey(s.completedAt ?? s.startedAt),
  );
  const streak = computeStreak(dateKeys);

  function repeatSession(session: Session) {
    const now = new Date().toISOString();
    const copy: Session = {
      id: uid(),
      routineId: session.routineId,
      routineName: session.routineName
        ? `${session.routineName} (ripetuta)`
        : "Sessione ripetuta",
      type: session.type,
      status: "active",
      notes: session.notes,
      startedAt: now,
      resumedAt: now,
      pausedElapsedSeconds: 0,
      exercises: session.exercises.map((ex) => ({
        ...ex,
        id: uid(),
        sets: ex.sets.map((s) => ({
          ...s,
          id: uid(),
          completed: false,
          completedAt: undefined,
        })),
      })),
    };
    upsertSession(copy);
    setActiveSessionId(copy.id);
    router.push(`/session/live?id=${copy.id}`);
  }

  function removeSession(session: Session) {
    const label = session.routineName ?? "questa sessione";
    if (
      !confirm(
        `Eliminare “${label}”? I dati di volume e PR di questa sessione spariranno dallo storico.`,
      )
    ) {
      return;
    }
    deleteSession(session.id);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 border-y border-hairline py-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Streak</div>
          <Mono className="text-3xl text-accent">{streak}</Mono>
          <div className="text-xs text-muted">giorni consecutivi</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Sessioni</div>
          <Mono className="text-3xl">{completed.length}</Mono>
          <div className="text-xs text-muted">completate</div>
        </div>
      </div>

      <CalendarStreak dateKeys={dateKeys} />

      {completed.length === 0 ? (
        <EmptyState
          title="Nessuna sessione ancora"
          description="Completa il tuo primo allenamento per vedere lo storico qui."
          action={
            <Link href="/routines">
              <Button type="button">Vai alle routine</Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {completed.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 py-4">
              <Link
                href={`/history/${s.id}`}
                className="min-w-0 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="font-medium">
                  {s.routineName ?? "Sessione"}
                  {s.prs && s.prs.length > 0 && (
                    <span className="ml-2 text-xs text-accent">PR</span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {new Date(s.completedAt ?? s.startedAt).toLocaleString("it-IT")} ·{" "}
                  {s.exercises.length} esercizi · {s.type}
                </div>
              </Link>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => repeatSession(s)}
                >
                  Ripeti
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="flex-1"
                  onClick={() => removeSession(s)}
                >
                  Elimina
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

